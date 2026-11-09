-- Fresh topics preserve old transcripts and select a durable, empty identity.
local plugin_root = vim.fn.getcwd()
vim.opt.rtp:append(plugin_root)
require('ai').setup(dofile(plugin_root .. '/tests/fixtures/ai_setup.lua').options({ comments = { enabled = false }, limits = { shutdown_ms = 100 } }))
local root = vim.fn.tempname()
vim.fn.mkdir(root, 'p')
root = vim.uv.fs_realpath(root)
vim.cmd.cd(root)
vim.fn.writefile({ 'value = 1' }, root .. '/topic.py')
vim.cmd.edit(root .. '/topic.py')
local sessions = require('ai.session')
local function wait_for(fn) assert(vim.wait(6000, fn, 10), 'new conversation test timed out') end
local function text(buf)
  local parts = vim.api.nvim_buf_get_lines(buf, 0, -1, false)
  for _, w in ipairs(vim.fn.win_findbuf(buf)) do
    local footer = vim.api.nvim_win_get_config(w).footer
    if type(footer) == 'table' then
      for _, chunk in ipairs(footer) do parts[#parts + 1] = type(chunk) == 'table' and chunk[1] or chunk end
    elseif type(footer) == 'string' then parts[#parts + 1] = footer end
  end
  return table.concat(parts, '\n')
end
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
  { open = 'AIChat', new = 'AIChatNew', stop = 'AIChatStop', restart = 'AIChatRestart', mode = 'chat', role = 'chat' },
  { open = 'AIToggle', new = 'AINew', stop = 'AIStop', restart = 'AIRestart', mode = 'edit', role = 'cheap' },
}) do
  vim.cmd(workflow.open)
  local buf = vim.api.nvim_get_current_buf()
  local identity = sessions.identity(root, workflow.mode, workflow.role)
  local old = sessions.id(identity)
  local count = #records()
  input(buf, 'Previous topic')
  wait_for(function() return #records() == count + 1 end)
  vim.cmd(workflow.new) -- busy: refuse, keep context and output
  assert(sessions.id(identity) == old)
  wait_for(function() return ready(buf) and text(buf):find('done', 1, true) end)
  assert(records()[count + 1].previous_messages == 0)
  vim.cmd(workflow.new)
  local fresh = sessions.id(identity)
  assert(fresh ~= old)
  wait_for(function() return ready(buf) end)
  assert(not text(buf):find('Previous topic', 1, true))
  assert(not text(buf):find('done', 1, true))
  assert(require('ai.session_ids').load(identity) == fresh)
  input(buf, 'Unrelated topic')
  wait_for(function() return #records() == count + 2 end)
  assert(records()[count + 2].session_id == fresh)
  assert(records()[count + 2].previous_messages == 0)
  assert(records()[count + 2].model == (workflow.role == 'chat' and 'gpt-6.1-sol-2026-09-29' or 'gpt-6-luna-2026-09-22'))
  wait_for(function() return ready(buf) and text(buf):find('done', 1, true) end)
  if vim.env.AI_TEST_HISTORY_DIR then
    assert(vim.fn.filereadable(vim.env.AI_TEST_HISTORY_DIR .. '/workbench/' .. old .. '.json') == 1, 'old transcript removed')
  end
  vim.cmd(workflow.stop)
  vim.wait(200)
  vim.cmd(workflow.restart)
  wait_for(function() return text(buf):find('Unrelated topic', 1, true) or text(buf):find('earlier messages hidden', 1, true) end)
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
