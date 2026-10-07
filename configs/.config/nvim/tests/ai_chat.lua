-- Run from ~/.config/nvim: AI_TEST_LOG=/tmp/ai-chat-test.log PATH="$PWD/tests/bin:$PATH" nvim --headless -u NONE -l tests/ai_chat.lua
vim.opt.rtp:append(vim.fn.getcwd())
local function wait_for(fn) assert(vim.wait(6000, fn, 20), 'timed out') end
local function records()
  local lines = vim.fn.filereadable(vim.env.AI_TEST_LOG) == 1 and vim.fn.readfile(vim.env.AI_TEST_LOG) or {}
  return vim.tbl_map(vim.json.decode, lines)
end
vim.fn.delete(vim.env.AI_TEST_LOG)
require('ai').setup()
assert(vim.fn.maparg('<leader>aic', 'n') ~= '')
vim.cmd.AIChat()
local conversation = vim.api.nvim_get_current_buf()
local function input(message)
  for _, map in ipairs(vim.api.nvim_buf_get_keymap(conversation, 'n')) do
    if map.lhs == 'i' then map.callback(); break end
  end
  local buf = vim.api.nvim_get_current_buf()
  assert(buf ~= conversation)
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, { message })
  for _, map in ipairs(vim.api.nvim_buf_get_keymap(buf, 'i')) do
    if map.lhs == '<CR>' then map.callback(); return end
  end
  error('missing Enter mapping')
end
input('Hi from web chat')
input('Second message')
if not vim.wait(6000, function() return #records() == 2 end, 20) then
  error('chat did not dispatch: ' .. table.concat(vim.api.nvim_buf_get_lines(conversation, 0, -1, false), '\n'))
end
assert(records()[1].mode == 'chat')
assert(records()[1].model == 'gpt-6.1-sol-2026-09-29')
assert(records()[2].message == 'Second message')
assert(records()[1].session_id == records()[2].session_id)
wait_for(function() return table.concat(vim.api.nvim_buf_get_lines(conversation, 0, -1, false), '\n'):find('### Pi\n\ndone', 1, true) ~= nil end)
vim.cmd.AIChat()
vim.cmd.AIChat()
assert(vim.api.nvim_get_current_buf() == conversation)
vim.cmd.AIChatStop()
if not vim.wait(3000, function() return table.concat(vim.api.nvim_buf_get_lines(conversation, 0, -1, false), '\n'):find('Stopped', 1, true) ~= nil end, 20) then
  error('chat stop failed: ' .. table.concat(vim.api.nvim_buf_get_lines(conversation, 0, -1, false), '\n'))
end
print('AI chat tests passed')
