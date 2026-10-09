-- Canonical paths shared by comments, chat, and scratch conversation buffers.
local M = {}

function M.inside(path, root)
  return root == '/' or path:sub(1, #root + 1) == root .. '/'
end

function M.for_buffer(buf)
  if not vim.api.nvim_buf_is_valid(buf) or vim.bo[buf].buftype ~= '' then return nil end
  local name = vim.api.nvim_buf_get_name(buf)
  if name == '' then return nil end
  local path = vim.uv.fs_realpath(name)
  if not path then return nil end
  local root = vim.uv.fs_realpath(vim.fs.root(buf, '.git') or vim.fn.getcwd())
  if root and M.inside(path, root) then return root, path end
end

function M.current()
  local buf = vim.api.nvim_get_current_buf()
  if vim.b[buf].ai_root then return vim.b[buf].ai_root end
  local root = M.for_buffer(buf)
  return root
end

function M.chat_root()
  return M.current() or vim.uv.fs_realpath(vim.fn.getcwd()) or vim.fn.getcwd()
end

return M
