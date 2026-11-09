-- Persist only profile-aware session pointers. Pi continues to own transcript files.
local M = {}
local fields = { 'version', 'profile', 'agent_dir', 'root', 'mode', 'role', 'provider', 'id', 'thinking' }

local function key(identity)
  assert(type(identity) == 'table', 'AI: session identity must be a table')
  local encoded = {}
  for _, field in ipairs(fields) do
    local value = identity[field]
    assert(type(value) == 'string', 'AI: session identity is missing ' .. field)
    encoded[#encoded + 1] = #value .. ':' .. value
  end
  return vim.fn.sha256(table.concat(encoded))
end

local function filename(identity)
  return vim.fs.joinpath(vim.fn.stdpath('state'), 'ai-profile-sessions', key(identity) .. '.id')
end

function M.load(identity)
  local ok, lines = pcall(vim.fn.readfile, filename(identity))
  if ok and #lines == 1 and lines[1]:match('^%x%x%x%x%x%x%x%x%-%x%x%x%x%-4%x%x%x%-[89ab]%x%x%x%-%x%x%x%x%x%x%x%x%x%x%x%x$') then
    return lines[1]
  end
end

function M.fresh(identity)
  local hash = vim.fn.sha256(key(identity) .. ':' .. vim.uv.hrtime() .. ':' .. vim.fn.getpid())
  local id = hash:sub(1, 8) .. '-' .. hash:sub(9, 12) .. '-4' .. hash:sub(14, 16)
    .. '-8' .. hash:sub(18, 20) .. '-' .. hash:sub(21, 32)
  local path = filename(identity)
  local temp = path .. '.' .. vim.fn.getpid() .. '.' .. vim.uv.hrtime() .. '.tmp'
  local ok = pcall(function()
    vim.fn.mkdir(vim.fs.dirname(path), 'p', '0700')
    assert(vim.fn.writefile({ id }, temp) == 0, 'write failed')
    assert(vim.uv.fs_rename(temp, path), 'rename failed')
  end)
  if not ok then
    pcall(vim.fn.delete, temp)
    return nil, 'Could not save new profile session identity; previous conversation retained'
  end
  return id
end

return M
