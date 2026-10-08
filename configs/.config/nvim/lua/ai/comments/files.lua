-- All on-disk comparisons and marker mutation are isolated in this module.
local roots = require('ai.project')
local markers = require('ai.comments.markers')
local M = {}

function M.matches(path, buf)
  if vim.bo[buf].fileformat ~= 'unix' or vim.bo[buf].binary or vim.bo[buf].modified then return false end
  local stat = vim.uv.fs_stat(path)
  if not stat or stat.size > require('ai.config').options.limits.file_bytes then return false end
  local fd = vim.uv.fs_open(path, 'r', 0)
  if not fd then return false end
  local bytes = vim.uv.fs_read(fd, stat.size, 0)
  vim.uv.fs_close(fd)
  local lines = vim.api.nvim_buf_get_lines(buf, 0, -1, false)
  local expected = table.concat(lines, '\n') .. (vim.bo[buf].endofline and '\n' or '')
  return bytes == expected, lines
end

function M.checktime(project)
  for _, buf in ipairs(vim.api.nvim_list_bufs()) do
    if roots.for_buffer(buf) == project.root and not vim.bo[buf].modified then
      pcall(vim.api.nvim_buf_call, buf, function() vim.cmd('checktime') end)
    end
  end
end

function M.cleanup(project, item)
  if not item.marker then return end
  M.checktime(project)
  local buf = item.buf
  if not vim.api.nvim_buf_is_valid(buf) or vim.api.nvim_buf_get_name(buf) ~= item.path then
    return vim.notify('AI: Marker retained: original buffer unavailable.', vim.log.levels.WARN)
  end
  if roots.for_buffer(buf) ~= project.root then return end
  local match, lines = M.matches(item.path, buf)
  local replacement = match and markers.cleanup_line(lines, item.marker)
  if not replacement then
    return vim.notify('AI: Marker retained: file or buffer changed; handled request will not replay.', vim.log.levels.WARN)
  end
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, replacement)
  local ok = pcall(vim.api.nvim_buf_call, buf, function() vim.cmd('noautocmd write') end)
  if not ok then vim.notify('AI: Marker cleanup could not be saved; check the buffer before writing.', vim.log.levels.WARN) end
end

return M
