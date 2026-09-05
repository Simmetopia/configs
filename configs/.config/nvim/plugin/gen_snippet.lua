local M = {}

local API_URL = "https://llm-gw.itmindsinternal.dk/v1/chat/completions"
local SNIPPET_DIR = vim.fn.stdpath('config') .. "/snippets"

-- Measured on this gateway with an 11-line TypeScript selection:
--   chat-fast      ~2s   no reasoning tokens, occasionally one stray line
--   mistral-medium-3.5 ~3s   collapses adjacent text nodes, few tabstops
--   gpt-oss-120b   ~56s  byte-exact, generous tabstops
--   glm-5.2        ~59s
--   qwen3.6-35b    ~79s  18k reasoning tokens for 500 chars of answer
--   code-default   ~164s often returns reasoning only, content = null
-- Default to the faithful one; reach for a fast one with :GenSnippet chat-fast
-- (or vim.g.gen_snippet_model) when the wait is not worth it.
local DEFAULT_MODEL = "gpt-oss-120b"
local API_TIMEOUT_MS = 180000

-- Set by `:GenSnippet <model>` for a single invocation.
local requested_model = nil

local function api_model()
  return requested_model or vim.g.gen_snippet_model or DEFAULT_MODEL
end

local MODELS = {
  "chat-fast", "mistral-medium-3.5", "mistral-small-3.2", "gpt-oss-120b",
  "glm-5.2", "qwen3.6-35b", "qwen3-235b", "llama-3.3-70b", "code-default",
}

local SYSTEM_PROMPT = [[
You convert code into a LuaSnip snippet.

Output ONLY a Lua table literal. No `return`, no requires, no markdown fences,
no comments, no prose. Shape:

{
  s('trig', {
    t({ 'const ' }),
    i(1, 'name'),
    t({ ' = () => {', '  return ' }),
    i(2, 'null'),
    t({ ';', '};' }),
  }, { desc = 'short description' }),
}

How text nodes work — this is the part that is easy to get wrong:
- A text node holds a LIST OF LINES. t({ 'a', 'b' }) emits `a`, a newline, `b`.
- Newlines exist ONLY between elements of one list. Adjacent nodes are joined
  with nothing at all: t({ 'a' }), t({ 'b' }) emits `ab` on ONE line, not two.
- Therefore put each contiguous run of literal code in a SINGLE t({ ... }) call,
  one string per line, and start a new t({ ... }) only after a tabstop.
- Never put a newline character inside a string. t('a\nb') is invalid and errors.
- When a tabstop ends a line, the following node must start with '' to break the
  line: i(1), t({ '', 'next line' }).
- Preserve the original indentation as leading spaces or tabs inside each string.

Tabstops:
- i(n), numbered from 1 in document order. i(n, 'placeholder') prefills it.
- Replace only what a user would retype: identifiers, string literals, types and
  values. Keep keywords, punctuation and structure as static text.
- Insert at least one tabstop; an all-static snippet is wrong.
- i(0) marks the final cursor position, only if it is not at the very end.
- c(n, { t({ 'a' }), t({ 'b' }) }) offers a choice; options are nodes, not strings.
- sn(n, { ... }) nests a snippet node.
- Only s, t, i, c and sn exist. Do not use f, d, rep or any other builder.

Fidelity:
- Every line of the input must appear in the output, in order, byte for byte,
  except where a tabstop replaces a value. Never reformat, reflow, reindent, or
  drop punctuation such as semicolons, commas, braces or parentheses.
- Escape for Lua single-quoted strings: \' for a quote and \\ for a backslash.

Trigger: 2-6 lowercase characters from the code's main identifier
(`createServerFn` -> 'sfn', `getTodosForUser` -> 'gtu').

Metadata: always pass { desc = '...' } as the third argument, max 50 chars, with
no other keys.
]]

-- Session state for the currently open generation buffer.
local state = {
  bufnr = nil,
  filetype = nil,
  trigger = nil,
  code = nil,
}

local api_key_cache = nil

local function trim(str)
  return (str:gsub("^%s+", ""):gsub("%s+$", ""))
end

local function notify(msg, level)
  vim.notify(msg, level or vim.log.levels.INFO, { title = "GenSnippet" })
end

---Read the LiteLLM key from 1Password, asynchronously, and cache it per session.
local function with_api_key(callback)
  if api_key_cache then
    callback(api_key_cache)
    return
  end

  vim.system(
    { "env", "OP_NO_INTERACTIVE=1", "op", "read", "op://work/litellm/credential" },
    { text = true },
    function(result)
      if result.code ~= 0 then
        vim.schedule(function()
          notify("Failed to read API key from 1Password: " .. trim(result.stderr or "unknown error"),
            vim.log.levels.ERROR)
          callback(nil)
        end)
        return
      end
      api_key_cache = trim(result.stdout or "")
      vim.schedule(function()
        callback(api_key_cache ~= "" and api_key_cache or nil)
      end)
    end
  )
end

---vim.json.decode maps JSON null to vim.NIL, a truthy userdata; normalize to nil.
local function unwrap(v)
  if v == nil or v == vim.NIL then return nil end
  return v
end

---Reassemble an SSE stream into a single response body. Returns nil if `raw`
---is not SSE, so the caller can fall through to plain JSON parsing.
local function join_sse(raw)
  if not raw:match("^%s*data:") then return nil end

  local parts = {}
  for line in raw:gmatch("[^\n]+") do
    local payload = line:match("^data:%s*(.*)$")
    if payload and payload ~= "" and payload ~= "[DONE]" then
      local ok, chunk = pcall(vim.json.decode, payload)
      local choice = ok and type(chunk) == "table" and chunk.choices and chunk.choices[1]
      local delta = choice and (choice.delta or choice.message)
      local content = delta and unwrap(delta.content)
      if type(content) == "string" then
        parts[#parts + 1] = content
      end
    end
  end

  if #parts == 0 then return nil end
  return table.concat(parts)
end

local function extract_content(decoded)
  local choice = type(decoded.choices) == "table" and decoded.choices[1]
  if type(choice) ~= "table" then return nil end

  local msg = type(choice.message) == "table" and choice.message or choice.delta
  if type(msg) ~= "table" then return nil end

  local content = unwrap(msg.content) or unwrap(msg.text)
  if type(content) == "string" and content ~= "" then
    return content
  end

  -- Reasoning models on this gateway answer with content = null and the whole
  -- budget spent in reasoning_content. That text is deliberation, never the
  -- snippet, so report it as a failure instead of trying to parse it.
  local reasoning = unwrap(msg.reasoning_content)
  if not reasoning then
    local psf = unwrap(msg.provider_specific_fields)
    if type(psf) == "table" then reasoning = unwrap(psf.reasoning) end
  end
  if type(reasoning) == "string" and reasoning ~= "" then
    return nil, ("%s thought for %d characters but returned no answer (finish_reason=%s). Try a shorter selection or :GenSnippet chat-fast.")
      :format(api_model(), #reasoning, tostring(unwrap(choice.finish_reason)))
  end

  return nil
end

---Strip markdown fences and any prose the model wrapped the table in.
local function extract_lua(content)
  content = content:gsub("<think>.-</think>", "")

  local fenced = content:match("```%s*lua%s*\n(.-)```") or content:match("```%s*\n?(.-)```")
  local code = trim(fenced or content)

  -- Drop a `return` the prompt asked it not to emit, then keep only the table.
  code = code:gsub("^return%s+", "")
  local first = code:find("{", 1, true)
  local last = code:match(".*()}")
  if first and last and last > first then
    code = code:sub(first, last)
  end

  return trim(code)
end

local function send_to_llm(code, filetype, callback)
  with_api_key(function(api_key)
    if not api_key then
      callback(nil)
      return
    end

    local body = vim.json.encode({
      model = api_model(),
      max_tokens = 8192,
      stream = false,
      temperature = 0,
      messages = {
        { role = "system", content = SYSTEM_PROMPT },
        {
          role = "user",
          content = ("Convert this %s code to a LuaSnip snippet:\n\n```%s\n%s\n```")
            :format(filetype ~= "" and filetype or "source", filetype, code),
        },
      },
    })

    local function fail(msg)
      vim.schedule(function()
        notify(msg, vim.log.levels.ERROR)
        callback(nil)
      end)
    end

    vim.system({
      "curl", "-sS", "--max-time", tostring(math.floor(API_TIMEOUT_MS / 1000)),
      "-X", "POST", API_URL,
      "-H", "Content-Type: application/json",
      "-H", "Authorization: Bearer " .. api_key,
      "--data-binary", "@-",
    }, { text = true, stdin = body, timeout = API_TIMEOUT_MS + 5000 }, function(result)
      if result.code ~= 0 then
        return fail("API call failed (exit " .. result.code .. "): " ..
          trim(result.stderr or "") .. trim((result.stdout or ""):sub(1, 200)))
      end

      local raw = result.stdout or ""
      local content = join_sse(raw)

      if not content then
        local ok, decoded = pcall(vim.json.decode, raw)
        if not ok or type(decoded) ~= "table" then
          return fail("Could not parse API response: " .. trim(raw:sub(1, 300)))
        end
        if decoded.error then
          local err = decoded.error
          return fail("API error: " .. (type(err) == "table" and tostring(unwrap(err.message)) or tostring(err)))
        end
        local why
        content, why = extract_content(decoded)
        if not content and why then
          return fail(why)
        end
      end

      if not content or trim(content) == "" then
        return fail("Empty response from API: " .. trim(raw:sub(1, 200)))
      end

      local lua_code = extract_lua(content)
      if lua_code == "" then
        return fail("No Lua table found in response: " .. trim(content:sub(1, 200)))
      end

      vim.schedule(function()
        callback(lua_code)
      end)
    end)
  end)
end

---Compile and build the snippet table in a sandbox so we never write a file
---that LuaSnip cannot load. Returns snippets, err.
local function build_snippets(text)
  local ls_ok, ls = pcall(require, "luasnip")
  if not ls_ok then
    return nil, "luasnip is not available"
  end

  local collected = {}
  local env = setmetatable({
    s = function(...)
      local ok, snip = pcall(ls.s, ...)
      if not ok then error(snip, 0) end
      collected[#collected + 1] = snip
      return snip
    end,
    t = function(txt, ...)
      if type(txt) == "string" and txt:find("\n", 1, true) then
        txt = vim.split(txt, "\n", { plain = true })
      end
      return ls.text_node(txt, ...)
    end,
    i = ls.insert_node,
    c = ls.choice_node,
    sn = ls.snippet_node,
    f = ls.function_node,
    d = ls.dynamic_node,
    r = ls.restore_node,
  }, { __index = _G })

  local chunk, syntax_err = loadstring("return " .. text, "@gen_snippet")
  if not chunk then
    return nil, "syntax error: " .. tostring(syntax_err)
  end
  setfenv(chunk, env)

  local ok, err = pcall(chunk)
  if not ok then
    return nil, "build error: " .. tostring(err)
  end

  if #collected == 0 then
    return nil, "no snippets defined (expected a table of s(...) calls)"
  end

  -- Catch newline-in-text-node and friends now rather than on first expansion.
  for _, snip in ipairs(collected) do
    local expand_ok, expand_err = pcall(function()
      return snip:copy():get_static_text()
    end)
    if not expand_ok then
      return nil, "invalid snippet '" .. tostring(snip.trigger) .. "': " .. tostring(expand_err)
    end
  end

  return collected, nil
end

local IDENT = "[%a_][%w_]*"

---Guess a trigger from the source code, best-effort.
local function infer_trigger(code, filetype)
  local patterns = {
    lua = { "local%s+function%s+(" .. IDENT .. ")", "function%s+[%w_.:]-([%a_][%w_]*)%s*%(", "local%s+(" .. IDENT .. ")%s*=" },
    python = { "def%s+(" .. IDENT .. ")", "class%s+(" .. IDENT .. ")" },
    javascript = { "function%s+(" .. IDENT .. ")", "class%s+(" .. IDENT .. ")", "const%s+(" .. IDENT .. ")", "let%s+(" .. IDENT .. ")", "var%s+(" .. IDENT .. ")" },
    typescript = { "function%s+(" .. IDENT .. ")", "class%s+(" .. IDENT .. ")", "interface%s+(" .. IDENT .. ")", "type%s+(" .. IDENT .. ")", "const%s+(" .. IDENT .. ")" },
    rust = { "fn%s+(" .. IDENT .. ")", "struct%s+(" .. IDENT .. ")", "impl%s+(" .. IDENT .. ")" },
    go = { "func%s+(" .. IDENT .. ")", "type%s+(" .. IDENT .. ")" },
    elixir = { "defmodule%s+([%w_.]+)", "defp?%s+(" .. IDENT .. ")" },
    cs = { "class%s+(" .. IDENT .. ")", "record%s+(" .. IDENT .. ")", "[%w<>%[%]]+%s+(" .. IDENT .. ")%s*%(" },
    ocaml = { "let%s+rec%s+(" .. IDENT .. ")", "let%s+(" .. IDENT .. ")", "type%s+(" .. IDENT .. ")" },
    sh = { "(" .. IDENT .. ")%s*%(%)" },
  }
  patterns.javascriptreact = patterns.javascript
  patterns.typescriptreact = patterns.typescript
  patterns.fish = patterns.sh

  local ft_patterns = patterns[filetype]
  if not ft_patterns then
    ft_patterns = { "(" .. IDENT .. ")%s*[%(=]" }
  end

  for _, pat in ipairs(ft_patterns) do
    local match = code:match(pat)
    if match then
      -- camelCase / snake_case / dotted -> initials, else the first 4 chars.
      local initials = {}
      for word in match:gmatch("[%u]?[%l%d]+") do
        initials[#initials + 1] = word:sub(1, 1):lower()
      end
      if #initials >= 2 and #initials <= 6 then
        return table.concat(initials)
      end
      local trigger = match:gsub("[^%w]", ""):lower():sub(1, 4)
      if #trigger >= 2 then return trigger end
    end
  end

  return nil
end

---Compare what the snippet actually expands to against the code it came from.
---Adjacent text nodes concatenate without a newline and indentation is easy to
---lose, so a snippet can load cleanly and still not reproduce the original.
---Returns nil when they match, else a short report.
local function fidelity_report(snippets, code)
  if not code or #snippets == 0 then return nil end

  local ok, static = pcall(function() return snippets[1]:copy():get_static_text() end)
  if not ok or type(static) ~= "table" then return nil end

  local want = vim.split(code, "\n")
  -- The trailing blank line a selection often carries is not a real difference.
  while #want > 0 and trim(want[#want]) == "" do table.remove(want) end
  while #static > 0 and trim(static[#static]) == "" do table.remove(static) end

  local first_diff, diffs = nil, 0
  for idx = 1, math.max(#want, #static) do
    if want[idx] ~= static[idx] then
      diffs = diffs + 1
      first_diff = first_diff or idx
    end
  end

  if diffs == 0 then return nil end

  return ("expands to %d line%s, selection had %d; %d differ, first at line %d:\n  want: %s\n  got:  %s")
    :format(#static, #static == 1 and "" or "s", #want, diffs, first_diff,
      vim.inspect(want[first_diff]), vim.inspect(static[first_diff]))
end

---The generated snippet already names itself; that beats guessing.
local function trigger_from_snippet(text)
  return text:match("s%s*%(%s*['\"]([^'\"]+)['\"]")
end

local function buffer_is_open()
  return state.bufnr ~= nil and vim.api.nvim_buf_is_valid(state.bufnr)
end

local function close_buffer()
  local bufnr = state.bufnr
  state.bufnr = nil
  if bufnr and vim.api.nvim_buf_is_valid(bufnr) then
    vim.api.nvim_buf_delete(bufnr, { force = true })
  end
end

---Register the snippets for the running session so they expand immediately.
local function register(filetype, filepath, snippets, existed)
  local ls_ok, ls = pcall(require, "luasnip")
  if not ls_ok then return end

  local key = "gen_snippet:" .. filepath

  if existed then
    -- Drop anything we registered under our own key first, so a re-save of the
    -- same file does not leave two copies behind.
    pcall(ls.add_snippets, filetype, {}, { key = key })
    if pcall(require("luasnip.loaders").reload_file, filepath) then
      return
    end
  end

  pcall(ls.add_snippets, filetype, snippets, { key = key })
end

---@param opts? { trigger?: string, filetype?: string }
local function save_snippet(opts)
  opts = opts or {}

  if not buffer_is_open() then
    notify("No snippet buffer open — run :GenSnippet first", vim.log.levels.WARN)
    state.bufnr = nil
    return
  end

  local bufnr = state.bufnr
  local text = trim(table.concat(vim.api.nvim_buf_get_lines(bufnr, 0, -1, false), "\n"))
  if text == "" then
    notify("Nothing to save — buffer is empty", vim.log.levels.WARN)
    return
  end

  local snippets, err = build_snippets(text)
  if not snippets then
    notify("Not saved — " .. err, vim.log.levels.ERROR)
    return
  end

  local filetype = opts.filetype or state.filetype or "all"
  if filetype == "" then filetype = "all" end

  local trigger = opts.trigger
    or trigger_from_snippet(text)
    or state.trigger
    or tostring(snippets[1].trigger)
  trigger = trigger:gsub("[^%w_%-]", "")
  if trigger == "" then
    notify("Not saved — could not determine a filename; use :GenSnippetSave <trigger>",
      vim.log.levels.ERROR)
    return
  end

  -- LuaSnip's from_lua loader takes the filetype from the path, so it must be
  -- `<dir>/<filetype>/<name>.lua` (or `<dir>/<filetype>.lua`).
  local dir = SNIPPET_DIR .. "/" .. filetype
  local filepath = dir .. "/" .. trigger .. ".lua"
  local existed = vim.uv.fs_stat(filepath) ~= nil

  if existed then
    local choice = vim.fn.confirm(filetype .. "/" .. trigger .. ".lua exists. Overwrite?", "&Yes\n&No", 2)
    if choice ~= 1 then
      notify("Cancelled", vim.log.levels.WARN)
      return
    end
  end

  vim.fn.mkdir(dir, "p")
  local ok, write_err = pcall(vim.fn.writefile, vim.split("return " .. text, "\n"), filepath)
  if not ok then
    notify("Failed to write " .. filepath .. ": " .. tostring(write_err), vim.log.levels.ERROR)
    return
  end

  register(filetype, filepath, snippets, existed)

  local triggers = vim.tbl_map(function(snip) return tostring(snip.trigger) end, snippets)
  notify(("Saved snippets/%s/%s.lua — %s ready in %s buffers")
    :format(filetype, trigger, table.concat(triggers, ", "), filetype))

  close_buffer()
end

local function open_review_buffer(lua_code)
  if buffer_is_open() then
    close_buffer()
  end

  local bufnr = vim.api.nvim_create_buf(false, true)
  vim.bo[bufnr].filetype = "lua"
  vim.bo[bufnr].buftype = "nofile"
  pcall(vim.api.nvim_buf_set_name, bufnr, "gen-snippet://" .. (state.trigger or "snippet"))
  vim.api.nvim_buf_set_lines(bufnr, 0, -1, false, vim.split(lua_code, "\n"))

  state.bufnr = bufnr

  local winid = vim.api.nvim_open_win(bufnr, true, {
    split = "right",
    width = math.max(60, math.floor(vim.o.columns * 0.4)),
  })
  vim.wo[winid].winbar = "GenSnippet  <CR> save   r rename+save   R regenerate   q discard"
  vim.wo[winid].number = false
  vim.wo[winid].signcolumn = "no"

  local function map(lhs, fn, desc)
    vim.keymap.set("n", lhs, fn, { buffer = bufnr, nowait = true, silent = true, desc = desc })
  end

  map("<CR>", function() save_snippet() end, "Save snippet")
  map("q", function()
    close_buffer()
    notify("Discarded", vim.log.levels.WARN)
  end, "Discard snippet")
  map("R", function() M.retry() end, "Regenerate from the same selection")
  map("r", function()
    vim.ui.input({ prompt = "Trigger: ", default = trigger_from_snippet(
      trim(table.concat(vim.api.nvim_buf_get_lines(bufnr, 0, -1, false), "\n"))
    ) or state.trigger or "" }, function(trigger)
      if not trigger or trigger == "" then
        notify("Cancelled", vim.log.levels.WARN)
        return
      end
      vim.ui.input({ prompt = "Filetype: ", default = state.filetype or "all" }, function(filetype)
        if not filetype then
          notify("Cancelled", vim.log.levels.WARN)
          return
        end
        save_snippet({ trigger = trigger, filetype = filetype })
      end)
    end)
  end, "Rename and save snippet")

  -- Keep our state honest if the buffer goes away by any other route.
  vim.api.nvim_create_autocmd({ "BufWipeout", "BufDelete" }, {
    buffer = bufnr,
    once = true,
    callback = function()
      if state.bufnr == bufnr then
        state.bufnr = nil
      end
    end,
  })
end

---@param line1 integer
---@param line2 integer
---@param model? string Override the model for this invocation.
function M.gen_snippet(line1, line2, model)
  local bufnr = vim.api.nvim_get_current_buf()
  local lines = vim.api.nvim_buf_get_lines(bufnr, line1 - 1, line2, false)
  local code = table.concat(lines, "\n")

  if trim(code) == "" then
    notify("Nothing to convert — the selected range is empty", vim.log.levels.WARN)
    return
  end

  requested_model = (model and model ~= "") and model or nil

  local filetype = vim.bo[bufnr].filetype
  state.filetype = filetype ~= "" and filetype or "all"
  state.trigger = infer_trigger(code, filetype)
  state.code = code

  local started = vim.uv.now()
  notify(("Generating snippet from %d line%s of %s via %s…")
    :format(#lines, #lines == 1 and "" or "s", state.filetype, api_model()))

  send_to_llm(code, filetype, function(lua_code)
    if not lua_code then return end

    local elapsed = (vim.uv.now() - started) / 1000
    local snippets, err = build_snippets(lua_code)
    open_review_buffer(lua_code)

    if err then
      notify(("Model returned an unloadable snippet — fix it, then <CR>: %s"):format(err),
        vim.log.levels.WARN)
      return
    end

    local drift = fidelity_report(snippets, code)
    if drift then
      notify(("Generated in %.1fs, but it %s"):format(elapsed, drift), vim.log.levels.WARN)
    else
      notify(("Generated in %.1fs — matches the selection. <CR> to save."):format(elapsed))
    end
  end)
end

---Re-run the last generation, optionally against a different model.
---@param model? string
function M.retry(model)
  if not state.code then
    notify("Nothing to retry — run :GenSnippet first", vim.log.levels.WARN)
    return
  end

  local code, filetype = state.code, state.filetype == "all" and "" or state.filetype
  requested_model = (model and model ~= "") and model or nil

  local started = vim.uv.now()
  notify(("Retrying via %s…"):format(api_model()))

  send_to_llm(code, filetype, function(lua_code)
    if not lua_code then return end

    local elapsed = (vim.uv.now() - started) / 1000
    local snippets, err = build_snippets(lua_code)
    open_review_buffer(lua_code)

    if err then
      notify(("Model returned an unloadable snippet — fix it, then <CR>: %s"):format(err),
        vim.log.levels.WARN)
      return
    end

    local drift = fidelity_report(snippets, code)
    notify(drift
      and ("Generated in %.1fs, but it %s"):format(elapsed, drift)
      or ("Generated in %.1fs — matches the selection. <CR> to save."):format(elapsed),
      drift and vim.log.levels.WARN or vim.log.levels.INFO)
  end)
end

local function complete_model(arg)
  return vim.tbl_filter(function(name) return name:find(arg, 1, true) == 1 end, MODELS)
end

vim.api.nvim_create_user_command("GenSnippet", function(cmd)
  M.gen_snippet(cmd.line1, cmd.line2, cmd.fargs[1])
end, {
  range = true,
  nargs = "?",
  complete = complete_model,
  desc = "Generate a LuaSnip snippet from the selection or range: :GenSnippet [model]",
})

vim.api.nvim_create_user_command("GenSnippetRetry", function(cmd)
  M.retry(cmd.fargs[1])
end, {
  nargs = "?",
  complete = complete_model,
  desc = "Retry the last generation, optionally with another model: :GenSnippetRetry [model]",
})

vim.api.nvim_create_user_command("GenSnippetSave", function(cmd)
  save_snippet({ trigger = cmd.fargs[1], filetype = cmd.fargs[2] })
end, { nargs = "*", desc = "Save the generated snippet: :GenSnippetSave [trigger] [filetype]" })

vim.keymap.set("x", "<leader>es", ":GenSnippet<CR>",
  { silent = true, desc = "Extract LuaSnip snippet from selection" })

return M
