-- Fresh topics preserve old transcripts and select a durable, empty identity.
vim.opt.rtp:append(vim.fn.getcwd())
local root = vim.fn.tempname()
vim.fn.mkdir(root, 'p')
root = vim.uv.fs_realpath(root)
vim.cmd.cd(root)
vim.fn.writefile({ 'value = 1' }, root .. '/topic.py')
vim.cmd.edit(root .. '/topic.py')
require('ai').setup({ comments = { enabled = false }, limits = { shutdown_ms = 100 } })
local sessions = require('ai.session')
local function wait_for(fn) assert(vim.wait(6000, fn, 10), 'new conversation test timed out') end
local function text(buf) return table.concat(vim.api.nvim_buf_get_lines(buf, 0, -1, false), '\n') end
local function records()
  if vim.fn.filereadable(vim.env.AI_TEST_LOG) == 0 then return {} end
  return vim.tbl_map(vim.json.decode, vim.fn.readfile(vim.env.AI_TEST_LOG))
end
local function input(buf, message)
  for _, map in ipairs(vim.api.nvim_buf_get_keymap(buf, 'n')) do
    if map.lhs == 'i' then map.callback(); break end
  end
  local draft = vim.api.nvim_get_current_buf()
  vim.api.nvim_buf_set_lines(draft, 0, -1, false, { message })
  for _, map in ipairs(vim.api.nvim_buf_get_keymap(draft, 'i')) do
    if map.lhs == '<CR>' then map.callback(); return end
  end
end
local function ready(buf)
  return not text(buf):find('Starting new', 1, true) and not text(buf):find('Connecting', 1, true)
    and not text(buf):find('starting new', 1, true) and not text(buf):find('Busy', 1, true)
    and not text(buf):find('busy (', 1, true) and text(buf):find('queued: 0', 1, true)
end
for _, workflow in ipairs({
  { open = 'AIChat', new = 'AIChatNew', stop = 'AIChatStop', restart = 'AIChatRestart', mode = 'chat', tier = 'sol' },
  { open = 'AIToggle', new = 'AINew', stop = 'AIStop', restart = 'AIRestart', mode = 'edit', tier = 'opus' },
}) do
  vim.cmd(workflow.open)
  local buf = vim.api.nvim_get_current_buf()
  local old = sessions.id(root, workflow.mode, workflow.tier)
  local count = #records()
  input(buf, 'Previous topic')
  wait_for(function() return #records() == count + 1 end)
  vim.cmd(workflow.new) -- busy: refuse, keep context and output
  assert(sessions.id(root, workflow.mode, workflow.tier) == old)
  wait_for(function() return ready(buf) and text(buf):find('done', 1, true) end)
  assert(records()[count + 1].previous_messages == 0)
  vim.cmd(workflow.new)
  local fresh = sessions.id(root, workflow.mode, workflow.tier)
  assert(fresh ~= old)
  wait_for(function() return ready(buf) end)
  assert(not text(buf):find('Previous topic', 1, true))
  assert(not text(buf):find('done', 1, true))
  assert(require('ai.session_ids').load(root, workflow.mode, workflow.tier) == fresh)
  input(buf, 'Unrelated topic')
  wait_for(function() return #records() == count + 2 end)
  assert(records()[count + 2].session_id == fresh)
  assert(records()[count + 2].previous_messages == 0)
  assert(records()[count + 2].model == (workflow.tier == 'sol' and 'gpt-6.1-sol-2026-09-29' or 'eu.anthropic.claude-opus-5-5'))
  wait_for(function() return ready(buf) and text(buf):find('done', 1, true) end)
  if vim.env.AI_TEST_HISTORY_DIR then
    assert(vim.fn.filereadable(vim.env.AI_TEST_HISTORY_DIR .. '/' .. old .. '.json') == 1, 'old transcript removed')
  end
  vim.cmd(workflow.stop)
  vim.wait(200)
  vim.cmd(workflow.restart)
  wait_for(function() return text(buf):find('Unrelated topic', 1, true) or text(buf):find('Previous Pi', 1, true) end)
  input(buf, 'Follow-up after reconnect')
  wait_for(function() return #records() == count + 3 end)
  assert(records()[count + 3].session_id == fresh)
  assert(records()[count + 3].previous_messages == 2)
  wait_for(function() return ready(buf) end)
  vim.cmd(workflow.stop)
  vim.wait(200)
  vim.cmd(workflow.open)
end
vim.fn.delete(root, 'rf')
print('AI new conversation tests passed')
