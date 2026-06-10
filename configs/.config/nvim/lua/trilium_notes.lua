local M = {}

local session_notes_dir = vim.fn.tempname() .. "-trilium-notes"

local defaults = {
  server_url = vim.env.TRILIUM_NEXT_SERVER or vim.env.TRILIUM_SERVER or "https://noter.bundgaard-egeberg.dk",
  token = vim.env.TRILIUM_NEXT_TOKEN or vim.env.TRILIUM_TOKEN or "",
  token_op_ref = vim.env.TRILIUM_NEXT_TOKEN_OP_REF or vim.env.TRILIUM_TOKEN_OP_REF or "",
  inbox_note_id = vim.env.TRILIUM_NEXT_INBOX_NOTE_ID or vim.env.TRILIUM_INBOX_NOTE_ID or "",
  notes_dir = function()
    return session_notes_dir
  end,
  delete_after_export = true,
  note_type = "code",
  mime = "text/x-markdown",
}

local config = vim.deepcopy(defaults)

local function resolve(value)
  if type(value) == "function" then
    return value()
  end

  return value
end

local function notify(message, level)
  vim.notify(message, level or vim.log.levels.INFO, { title = "Trilium notes" })
end

local function trim(value)
  return (value:gsub("^%s+", ""):gsub("%s+$", ""))
end

local function slugify(title)
  local slug = title:lower()
  slug = slug:gsub("[^%w%s%-_]", "")
  slug = slug:gsub("%s+", "-")
  slug = slug:gsub("%-+", "-")
  slug = slug:gsub("^%-+", ""):gsub("%-+$", "")

  if slug == "" then
    return "note"
  end

  return slug
end

local function normalize_path(path)
  local expanded = vim.fn.fnamemodify(vim.fn.expand(path), ":p")

  return vim.uv.fs_realpath(expanded) or expanded
end

local function note_dir_path()
  return normalize_path(resolve(config.notes_dir)):gsub("/+$", "")
end

local function note_path(title)
  local dir = note_dir_path()
  vim.fn.mkdir(dir, "p")

  local date = os.date("%Y-%m-%d-%H%M")
  local base = string.format("%s-%s.md", date, slugify(title))
  local path = dir .. "/" .. base
  local suffix = 1

  while vim.uv.fs_stat(path) do
    path = dir .. "/" .. string.format("%s-%s-%d.md", date, slugify(title), suffix)
    suffix = suffix + 1
  end

  return path
end

local function is_throwaway_note(path)
  if not path or path == "" then
    return false
  end

  local dir = note_dir_path() .. "/"
  local full_path = normalize_path(path)

  return full_path:sub(1, #dir) == dir
end

local function current_title()
  local lines = vim.api.nvim_buf_get_lines(0, 0, -1, false)

  for _, line in ipairs(lines) do
    local heading = line:match("^#%s+(.+)$")

    if heading then
      return trim(heading)
    end
  end

  local file = vim.api.nvim_buf_get_name(0)

  if file ~= "" then
    return vim.fn.fnamemodify(file, ":t:r")
  end

  return "Untitled"
end

local function current_language()
  if vim.bo.filetype ~= "" then
    return vim.bo.filetype
  end

  local extension = vim.fn.expand("%:e")

  if extension ~= "" then
    return extension
  end

  return "text"
end

local function visual_selection()
  local active_mode = vim.fn.mode()
  local is_active_visual = active_mode == "v" or active_mode == "V" or active_mode == "\22"
  local mode = is_active_visual and active_mode or vim.fn.visualmode()
  local start_pos = is_active_visual and vim.fn.getpos("v") or vim.fn.getpos("'<")
  local end_pos = is_active_visual and vim.fn.getpos(".") or vim.fn.getpos("'>")
  local start_line = start_pos[2]
  local start_col = start_pos[3]
  local end_line = end_pos[2]
  local end_col = end_pos[3]

  if start_line == 0 or end_line == 0 then
    return nil
  end

  if start_line > end_line or (start_line == end_line and start_col > end_col) then
    start_line, end_line = end_line, start_line
    start_col, end_col = end_col, start_col
  end

  local lines = vim.api.nvim_buf_get_lines(0, start_line - 1, end_line, false)

  if #lines == 0 then
    return nil
  end

  if mode == "v" then
    lines[#lines] = string.sub(lines[#lines], 1, end_col)
    lines[1] = string.sub(lines[1], start_col)
  elseif mode == "\22" then
    for index, line in ipairs(lines) do
      lines[index] = string.sub(line, start_col, end_col)
    end
  end

  local source_path = vim.api.nvim_buf_get_name(0)
  local filename = source_path ~= "" and vim.fn.fnamemodify(source_path, ":t") or "[No Name]"
  local line_reference = tostring(start_line)

  if end_line ~= start_line then
    line_reference = line_reference .. "-" .. end_line
  end

  return {
    filename = filename,
    source_path = source_path,
    line_reference = line_reference,
    reference = filename .. ":" .. line_reference,
    language = current_language(),
    lines = lines,
  }
end

local function note_lines(title, capture)
  local lines = { "# " .. title, "" }

  if not capture then
    table.insert(lines, "")
    return lines
  end

  table.insert(lines, "Source: `" .. capture.reference .. "`")

  if capture.source_path ~= "" then
    table.insert(lines, "File: `" .. capture.source_path .. "`")
  end

  table.insert(lines, "")
  table.insert(lines, "```" .. capture.language)

  for _, line in ipairs(capture.lines) do
    table.insert(lines, line)
  end

  table.insert(lines, "```")
  table.insert(lines, "")

  return lines
end

local function curl_quote(value)
  return '"' .. tostring(value):gsub("\\", "\\\\"):gsub('"', '\\"') .. '"'
end

local function cleanup(paths)
  for _, path in ipairs(paths) do
    if path and path ~= "" then
      pcall(vim.fn.delete, path)
    end
  end
end

local function read_op_token(op_ref)
  local result = vim.system({ "op", "read", op_ref }, { text = true }):wait()

  if result.code ~= 0 then
    local message = trim(result.stderr or "")

    if message == "" then
      message = trim(result.stdout or "")
    end

    notify("Could not read Trilium token from 1Password: " .. message, vim.log.levels.ERROR)
    return ""
  end

  return trim(result.stdout or "")
end

local function resolve_token()
  local token = trim(resolve(config.token) or "")

  if token ~= "" then
    return token
  end

  local token_op_ref = trim(resolve(config.token_op_ref) or "")

  if token_op_ref == "" then
    return ""
  end

  return read_op_token(token_op_ref)
end

local function require_config()
  local server_url = trim(resolve(config.server_url) or "")
  local token = resolve_token()
  local inbox_note_id = trim(resolve(config.inbox_note_id) or "")

  if server_url == "" then
    notify("Set TRILIUM_NEXT_SERVER or configure server_url.", vim.log.levels.ERROR)
    return
  end

  if token == "" then
    notify("Set TRILIUM_NEXT_TOKEN_OP_REF, TRILIUM_NEXT_TOKEN, or configure token_op_ref/token.", vim.log.levels.ERROR)
    return
  end

  if inbox_note_id == "" then
    notify("Set TRILIUM_NEXT_INBOX_NOTE_ID or configure inbox_note_id.", vim.log.levels.ERROR)
    return
  end

  return {
    server_url = server_url:gsub("/+$", ""),
    token = token,
    inbox_note_id = inbox_note_id,
  }
end

local function post_note(payload, required, callback)
  local body_path = vim.fn.tempname()
  local config_path = vim.fn.tempname()
  local body = vim.json.encode(payload)
  local url = required.server_url .. "/etapi/create-note"

  vim.fn.writefile({ body }, body_path)
  vim.fn.writefile({
    "url = " .. curl_quote(url),
    "request = " .. curl_quote("POST"),
    "silent",
    "show-error",
    "fail-with-body",
    "header = " .. curl_quote("Authorization: " .. required.token),
    "header = " .. curl_quote("Content-Type: application/json"),
    "data = " .. curl_quote("@" .. body_path),
  }, config_path)

  vim.system({ "curl", "--config", config_path }, { text = true }, function(result)
    cleanup({ body_path, config_path })

    vim.schedule(function()
      if result.code ~= 0 then
        local message = trim(result.stderr or "")

        if message == "" then
          message = trim(result.stdout or "")
        end

        notify("Export failed: " .. message, vim.log.levels.ERROR)
        return
      end

      local ok, decoded = pcall(vim.json.decode, result.stdout)

      if not ok then
        notify("Exported note, but could not parse response.", vim.log.levels.WARN)
        return
      end

      if callback then
        callback(decoded)
      end
    end)
  end)
end

function M.setup(opts)
  config = vim.tbl_deep_extend("force", vim.deepcopy(defaults), opts or {})
end

function M.new_note(title, capture)
  if not title or trim(title) == "" then
    vim.ui.input({ prompt = "Trilium note title: " }, function(input)
      if input and trim(input) ~= "" then
        M.new_note(input, capture)
      end
    end)

    return
  end

  title = trim(title)

  local path = note_path(title)
  vim.fn.writefile(note_lines(title, capture), path)
  vim.cmd.edit(vim.fn.fnameescape(path))
  vim.bo.filetype = "markdown"
  vim.cmd.normal({ "G", bang = true })
end

function M.new_note_from_selection()
  local capture = visual_selection()

  if not capture or trim(table.concat(capture.lines, "\n")) == "" then
    notify("Visual selection is empty.", vim.log.levels.ERROR)
    return
  end

  M.new_note(nil, capture)
end

function M.export_current_note()
  local title = current_title()
  local content = table.concat(vim.api.nvim_buf_get_lines(0, 0, -1, false), "\n")
  local source_path = vim.api.nvim_buf_get_name(0)

  if trim(content) == "" then
    notify("Current buffer is empty.", vim.log.levels.ERROR)
    return
  end

  local required = require_config()

  if not required then
    return
  end

  post_note({
    parentNoteId = required.inbox_note_id,
    title = title,
    type = config.note_type,
    mime = config.mime,
    content = content,
  }, required, function(response)
    local note_id = response.note and response.note.noteId
    local deleted = false

    if config.delete_after_export and is_throwaway_note(source_path) then
      deleted = vim.fn.delete(source_path) == 0
    end

    if note_id then
      notify("Exported '" .. title .. "' to Trilium (" .. note_id .. ").")
    else
      notify("Exported '" .. title .. "' to Trilium.")
    end

    if deleted then
      vim.bo.buftype = "nofile"
      vim.bo.bufhidden = "wipe"
      vim.bo.swapfile = false
      vim.bo.modified = false
    end
  end)
end

return M
