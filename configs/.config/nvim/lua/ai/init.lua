-- The single public entry point. Modules do not register global hooks themselves.
local M = {}
local configured = false

function M.setup(options)
  if configured then return end -- avoid duplicate commands/autocmds/process ownership
  local config = require('ai.config').setup(options)
  local comments = require('ai.comments')
  local chat = require('ai.chat')
  local commands = {
    AIToggle = comments.toggle, AIStatus = comments.status, AIAbort = comments.abort,
    AIStop = comments.stop, AIRestart = comments.restart,
    AIChat = chat.toggle, AIChatStop = chat.stop, AIChatRestart = chat.restart,
  }
  for name, callback in pairs(commands) do vim.api.nvim_create_user_command(name, callback, {}) end
  if config.mappings.project then
    vim.keymap.set('n', config.mappings.project, comments.toggle, { desc = 'Toggle project AI conversation' })
  end
  if config.mappings.chat then
    vim.keymap.set('n', config.mappings.chat, chat.toggle, { desc = 'Toggle Pi web chat' })
  end
  local group = vim.api.nvim_create_augroup('AI', { clear = true })
  if config.comments.enabled then
    vim.api.nvim_create_autocmd('BufWritePost', { group = group, callback = function(ev) comments.saved(ev.buf) end })
    vim.api.nvim_create_autocmd({ 'FocusGained', 'BufEnter' }, { group = group, callback = function(ev) comments.refresh(ev.buf) end })
  end
  vim.api.nvim_create_autocmd('VimResized', { group = group, callback = require('ai.ui.view').resize })
  vim.api.nvim_create_autocmd('VimLeavePre', { group = group, callback = require('ai.rpc').shutdown })
  configured = true
end

return M
