-- Persist only the current session identity. Old transcripts remain owned by Pi.
local M = {}

local function filename(root, mode, tier)
  local key = mode == 'chat' and (root .. ':web-chat') or (root .. ':' .. mode .. ':' .. tier)
  return vim.fn.stdpath('state') .. '/ai-sessions/' .. vim.fn.sha256(key) .. '.id'
end

function M.load(root, mode, tier)
  local ok, lines = pcall(vim.fn.readfile, filename(root, mode, tier))
  if ok and #lines == 1 and lines[1]:match('^%x%x%x%x%x%x%x%x%-%x%x%x%x%-4%x%x%x%-[89ab]%x%x%x%-%x%x%x%x%x%x%x%x%x%x%x%x$') then
    return lines[1]
  end
end

function M.fresh(root, mode, tier)
  local hash = vim.fn.sha256(root .. ':' .. mode .. ':' .. tier .. ':' .. vim.uv.hrtime() .. ':' .. vim.fn.getpid())
  local id = hash:sub(1, 8) .. '-' .. hash:sub(9, 12) .. '-4' .. hash:sub(14, 16)
    .. '-8' .. hash:sub(18, 20) .. '-' .. hash:sub(21, 32)
  local path = filename(root, mode, tier)
  local temp = path .. '.' .. vim.fn.getpid() .. '.tmp'
  local ok = pcall(function()
    vim.fn.mkdir(vim.fs.dirname(path), 'p', '0700')
    assert(vim.fn.writefile({ id }, temp) == 0, 'write failed')
    assert(vim.uv.fs_rename(temp, path), 'rename failed')
  end)
  if not ok then
    pcall(vim.fn.delete, temp)
    return nil, 'Could not save new session identity; previous conversation retained'
  end
  return id
end

return M
