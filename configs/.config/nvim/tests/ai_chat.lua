-- Run from ~/.config/nvim: AI_TEST_LOG=/tmp/ai-chat-test.log PATH="$PWD/tests/bin:$PATH" nvim --headless -u NONE -l tests/ai_chat.lua
vim.opt.rtp:append(vim.fn.getcwd())
local function wait_for(fn) assert(vim.wait(6000, fn, 20), 'timed out') end
local function records()
  local lines = vim.fn.filereadable(vim.env.AI_TEST_LOG) == 1 and vim.fn.readfile(vim.env.AI_TEST_LOG) or {}
  return vim.tbl_map(vim.json.decode, lines)
end
vim.fn.delete(vim.env.AI_TEST_LOG)
require('ai').setup(dofile('tests/fixtures/ai_setup.lua').options())
assert(vim.fn.maparg('<leader>aic', 'n') ~= '')
vim.cmd.AIChat()
local conversation = vim.api.nvim_get_current_buf()
local function text()
  local parts = { table.concat(vim.api.nvim_buf_get_lines(conversation, 0, -1, false), '\n') }
  for _, w in ipairs(vim.fn.win_findbuf(conversation)) do
    local footer = vim.api.nvim_win_get_config(w).footer
    if type(footer) == 'table' then
      for _, chunk in ipairs(footer) do parts[#parts + 1] = type(chunk) == 'table' and chunk[1] or chunk end
    elseif type(footer) == 'string' then parts[#parts + 1] = footer end
  end
  return table.concat(parts, '\n')
end
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
local refused, reason
require('ai.profiles').switch('studio', function(ok, why) refused, reason = ok, why end)
assert(refused == false and reason:find('web chat has active or queued work', 1, true))
assert(require('ai.profiles').status().active == 'workbench')
if not vim.wait(6000, function() return #records() == 2 end, 20) then
  error('chat did not dispatch: ' .. text())
end
assert(records()[1].mode == 'chat')
assert(records()[1].model == 'gpt-6.1-sol-2026-09-29')
assert(records()[2].message == 'Second message')
assert(records()[1].session_id == records()[2].session_id)
wait_for(function() return text():find('## Pi · gpt-6.1-sol\ndone', 1, true) ~= nil end)
vim.cmd.AIChat()
vim.cmd.AIChat()
assert(vim.api.nvim_get_current_buf() == conversation)
vim.cmd.AIChatClear()
local function assert_cleared(msg)
  local lines = vim.api.nvim_buf_get_lines(conversation, 0, -1, false)
  assert(#lines == 1 and lines[1] == '', msg .. ': ' .. vim.inspect(lines))
  assert(not text():find('done', 1, true), msg .. ': cleared text returned')
end
assert_cleared('clear left content')
assert(#records() == 2, 'clearing display sent a prompt')
vim.cmd.AIChat()
vim.cmd.AIChat()
assert_cleared('hidden output returned on toggle')
input('After clearing')
wait_for(function() return #records() == 3 end)
assert(records()[3].session_id == records()[1].session_id, 'clear changed session identity')
vim.cmd.AIChatStop()
if not vim.wait(3000, function() return text():find('Stopped', 1, true) ~= nil end, 20) then
  error('chat stop failed: ' .. text())
end
print('AI chat tests passed')
