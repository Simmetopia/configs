local M = {}

-- Marker grammar and fallback comment leaders. No process or file mutation here.

local prefixes = {
  lua = { '--' },
  sql = { '--' },
  python = { '#' },
  sh = { '#' },
  bash = { '#' },
  zsh = { '#' },
  ruby = { '#' },
  yaml = { '#' },
  toml = { '#' },
  conf = { '#', ';' },
  javascript = { '//' },
  typescript = { '//' },
  javascriptreact = { '//' },
  typescriptreact = { '//' },
  c = { '//' },
  cpp = { '//' },
  java = { '//' },
  go = { '//' },
  rust = { '//' },
  cs = { '//' },
  swift = { '//' },
  tsx = { '//' },
  vim = { '"' },
  lisp = { ';' },
  clojure = { ';' },
  scheme = { ';' },
  ini = { ';', '#' },
  dosini = { ';', '#' },
  elixir = { "#" }
}

local function in_string(line, position)
  local quote, escaped
  for i = 1, position - 1 do
    local char = line:sub(i, i)
    if escaped then
      escaped = false
    elseif quote and char == '\\' then
      escaped = true
    elseif quote and char == quote then
      quote = nil
    elseif not quote and (char == '"' or char == "'" or char == '`') then
      quote = char
    end
  end
  return quote ~= nil
end

local function parse_marker(text)
  local kind, instruction = text:match('^[Aa][Ii]([!?.]+)%s*(.-)%s*$')
  if not kind then instruction, kind = text:match('^(.-)%s+[Aa][Ii]([!?.]+)%s*$') end
  if (kind == '!' or kind == '!!' or kind == '?' or kind == '??' or kind == '.')
      and instruction and instruction ~= '' then
    return kind, instruction
  end
end

function M.parse(line, ft)
  local allowed = prefixes[ft]
  if not allowed then return nil end
  for _, prefix in ipairs(allowed) do
    local start = 1
    while true do
      local at = line:find(prefix, start, true)
      if not at then break end
      if (at == 1 or line:sub(at - 1, at - 1):match('%s')) and not in_string(line, at) then
        local kind, instruction = parse_marker(vim.trim(line:sub(at + #prefix)))
        if kind then
          return { kind = kind, instruction = instruction, line = line, comment_at = at }
        end
      end
      start = at + #prefix
    end
  end
end

-- Tree-sitter supplies the precise comment span; never search outside it.
function M.parse_comment(text, ft)
  for _, prefix in ipairs(prefixes[ft] or {}) do
    if text:sub(1, #prefix) == prefix then
      local kind, instruction = parse_marker(vim.trim(text:sub(#prefix + 1)))
      if kind then return { kind = kind, instruction = instruction, line = text, comment_at = 1 } end
      return nil
    end
  end
end

function M.collect(lines, resolve)
  local found = {}
  for i, line in ipairs(lines) do
    local marker = resolve(line, i)
    if marker and marker.kind ~= '.' then
      marker.number = i
      local context = {}
      for j = math.max(1, i - 4), i - 1 do
        local c = resolve(lines[j], j)
        if c and c.kind == '.' then context[#context + 1] = c.instruction end
      end
      marker.context = table.concat(context, '\n')
      found[#found + 1] = marker
    end
  end
  return found
end

function M.scan(lines, ft)
  return M.collect(lines, function(line) return M.parse(line, ft) end)
end

function M.key(path, marker)
  return path .. ':' .. marker.number .. ':' .. marker.line .. ':' .. marker.context
end

function M.enqueue(queue, seen, item)
  if seen[item.key] then return false end
  seen[item.key] = true
  queue[#queue + 1] = item
  return true
end

function M.pop(queue)
  return table.remove(queue, 1)
end

-- Call only after checking the on-disk bytes against the unmodified buffer.
function M.cleanup_line(lines, marker)
  if lines[marker.number] ~= marker.line then return nil end
  local result = vim.deepcopy(lines)
  local before = marker.line:sub(1, marker.comment_at - 1)
  if before:match('^%s*$') then
    table.remove(result, marker.number)
  else
    result[marker.number] = before:gsub('%s+$', '')
  end
  return result
end

return M
