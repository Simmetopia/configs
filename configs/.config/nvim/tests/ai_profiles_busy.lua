-- All-root workflow busy-state matrix. Every in-flight workflow is owned by a
-- second project root while profile switching is requested from the main root.
vim.opt.rtp:append(vim.fn.getcwd())
local setup = dofile('tests/fixtures/ai_setup.lua')
require('ai').setup(setup.options())

local profiles = require('ai.profiles')
local chat = require('ai.chat')
local comments = require('ai.comments')
local help = require('ai.help')
local sessions = require('ai.session')
local observed_lifecycle_events = {}
local real_session_start = sessions.start
sessions.start = function(root, mode, role, hooks, ...)
  local on_event = hooks.on_event
  hooks.on_event = function(session, event)
    if event.type == 'auto_retry_start' or event.type == 'auto_compaction_start' then
      observed_lifecycle_events[#observed_lifecycle_events + 1] = { mode = mode, root = root, type = event.type }
    end
    return on_event(session, event)
  end
  return real_session_start(root, mode, role, hooks, ...)
end
local gates = vim.env.AI_TEST_PROFILE_DIR .. '/gates'
local projects = vim.env.AI_TEST_PROFILE_DIR .. '/busy-projects'
vim.fn.mkdir(gates, 'p')
vim.fn.mkdir(projects, 'p')
vim.fn.delete(vim.env.AI_TEST_LOG)

local function wait_for(fn, label)
  assert(vim.wait(10000, fn, 10), 'timed out waiting for ' .. label)
end

local function gate(name)
  local hold, arrived = gates .. '/' .. name .. '.hold', gates .. '/' .. name .. '.arrived'
  vim.fn.writefile({ 'hold' }, hold)
  return function()
    vim.fn.delete(hold)
    wait_for(function() return vim.fn.filereadable(arrived) == 0 end, name .. ' release')
  end
end

local function log_count()
  local lines = vim.fn.filereadable(vim.env.AI_TEST_LOG) == 1 and vim.fn.readfile(vim.env.AI_TEST_LOG) or {}
  return #lines
end

local function project(name)
  local root = projects .. '/' .. name
  vim.fn.mkdir(root, 'p')
  root = assert(vim.uv.fs_realpath(root))
  local path = root .. '/first.py'
  vim.fn.writefile({ 'one' }, path)
  vim.cmd.cd(root)
  vim.cmd.edit(path)
  vim.bo.filetype = 'python'
  return root, vim.api.nvim_get_current_buf(), path
end

local function extra_buffer(root, name)
  local path = root .. '/' .. name .. '.py'
  vim.fn.writefile({ 'two' }, path)
  vim.cmd.edit(path)
  vim.bo.filetype = 'python'
  return vim.api.nvim_get_current_buf(), path
end

local main_root, main_buf = project('main')

local function hide_to_main()
  if vim.api.nvim_get_current_buf() ~= main_buf then
    -- Chat is the only workflow that owns a floating conversation buffer.
    local name = vim.api.nvim_buf_get_name(vim.api.nvim_get_current_buf())
    if name:find('ai://workbench:chat/project/', 1, true) then chat.toggle() end
  end
  vim.cmd.cd(main_root)
  vim.api.nvim_set_current_buf(main_buf)
  assert(vim.api.nvim_get_current_buf() == main_buf)
end

local function switch(name)
  local done, success, reason = false, nil, nil
  local started, err = profiles.switch(name, function(ok, why) done, success, reason = true, ok, why end)
  assert(started, err)
  wait_for(function() return done end, 'profile switch to ' .. name)
  assert(success, reason or ('profile switch to ' .. name .. ' failed'))
  wait_for(function() return require('ai.rpc').is_idle() end, 'retired Pi processes')
end

local function prove_released()
  hide_to_main()
  switch('studio')
  switch('workbench')
  assert(profiles.status().active == 'workbench')
end

local function refuse_hidden(workflow, expected)
  local token = profiles.token()
  local generation = token.generation
  local accepted, reason
  local started, err = profiles.switch('studio', function(ok, why) accepted, reason = ok, why end)
  assert(started == false, workflow .. ' state unexpectedly allowed a profile switch: ' .. tostring(err))
  assert(reason and reason:find(expected, 1, true), workflow .. ' refusal did not identify its work: ' .. tostring(reason))
  assert(accepted == false, workflow .. ' refusal callback did not preserve the work state')
  assert(profiles.status().active == token.name and token.name == 'workbench', workflow .. ' changed active profile on refusal')
  assert(profiles.token().generation == generation, workflow .. ' changed generation on refusal')
  return reason
end

local function idle_reason(module)
  return module.busy_reason()
end

local function run_chat_input(message)
  local conversation = vim.api.nvim_get_current_buf()
  for _, map in ipairs(vim.api.nvim_buf_get_keymap(conversation, 'n')) do
    if map.lhs == 'i' then map.callback(); break end
  end
  local draft = vim.api.nvim_get_current_buf()
  assert(draft ~= conversation, 'chat input did not open a draft')
  vim.api.nvim_buf_set_lines(draft, 0, -1, false, { message })
  for _, map in ipairs(vim.api.nvim_buf_get_keymap(draft, 'i')) do
    if map.lhs == '<CR>' then map.callback(); return end
  end
  error('missing chat Enter mapping')
end

local function show_chat(root, buf)
  vim.cmd.cd(root)
  vim.api.nvim_set_current_buf(buf)
  chat.toggle()
  wait_for(function() return chat.busy_reason() == nil end, 'chat startup')
  local chat_name = vim.api.nvim_buf_get_name(vim.api.nvim_get_current_buf())
  assert(chat_name:find('ai://workbench:chat/project/', 1, true), 'chat view did not open: ' .. chat_name)
end

local function start_comment(root, buf, lines)
  vim.cmd.cd(root)
  vim.api.nvim_set_current_buf(buf)
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
  vim.cmd.write()
end

local function start_help(root, buf, instruction)
  vim.cmd.cd(root)
  vim.api.nvim_set_current_buf(buf)
  vim.cmd('1AIHelp ' .. (instruction or 'UPPER'))
end

local function wait_idle(module, label)
  wait_for(function() return idle_reason(module) == nil end, label .. ' idle')
end

local function test_starting()
  local release = gate('startup')
  local root, buf = project('chat-starting')
  vim.cmd.cd(root)
  vim.api.nvim_set_current_buf(buf)
  chat.toggle()
  -- A chat without messages is still connecting while the Pi startup handshake is held.
  wait_for(function() return vim.fn.filereadable(gates .. '/startup.arrived') == 1 end, 'chat startup hold')
  hide_to_main()
  refuse_hidden('chat startup', 'web chat is connecting or exiting')
  assert(chat.busy_reason() ~= nil, 'hidden chat stopped being busy before startup release')
  release()
  wait_idle(chat, 'chat startup release')
  prove_released()

  local cr, cb = project('comments-starting')
  release = gate('startup')
  start_comment(cr, cb, { '# AI! starting comment' })
  wait_for(function() return vim.fn.filereadable(gates .. '/startup.arrived') == 1 end, 'comment startup hold')
  hide_to_main()
  refuse_hidden('comment startup', 'project conversation has active or queued work')
  assert(comments.busy_reason() ~= nil, 'hidden comment stopped being busy before startup release')
  release()
  wait_idle(comments, 'comment startup release')
  prove_released()

  local hr, hb = project('help-starting')
  release = gate('startup')
  start_help(hr, hb)
  wait_for(function() return vim.fn.filereadable(gates .. '/startup.arrived') == 1 end, 'help startup hold')
  hide_to_main()
  refuse_hidden('help startup', 'selection jobs are active or queued')
  assert(help.busy_reason() ~= nil, 'hidden help stopped being busy before startup release')
  release()
  wait_idle(help, 'help startup release')
  prove_released()
end

-- Buffer text plus the border footer of windows showing it (status lives in the footer).
local function view_text(buf)
  local parts = vim.api.nvim_buf_get_lines(buf, 0, -1, false)
  for _, w in ipairs(vim.fn.win_findbuf(buf)) do
    local footer = vim.api.nvim_win_get_config(w).footer
    if type(footer) == 'table' then
      for _, chunk in ipairs(footer) do parts[#parts + 1] = type(chunk) == 'table' and chunk[1] or chunk end
    elseif type(footer) == 'string' then parts[#parts + 1] = footer end
  end
  return table.concat(parts, '\n')
end

local function test_active_queued()
  local before = log_count()
  local root, buf = project('chat-queued')
  show_chat(root, buf)
  local release = gate('acceptance')
  run_chat_input('first queued chat')
  wait_for(function() return vim.fn.filereadable(gates .. '/acceptance.arrived') == 1 end, 'chat acceptance hold')
  run_chat_input('second queued chat')
  assert(view_text(vim.api.nvim_get_current_buf()):find('queued: 1', 1, true), 'chat did not retain the second prompt in its queue')
  hide_to_main()
  refuse_hidden('chat active/queued work', 'web chat has active or queued work')
  assert(chat.busy_reason() ~= nil, 'hidden chat work was lost after refusal')
  release()
  wait_for(function() return log_count() >= before + 2 and chat.busy_reason() == nil end, 'chat queue drain')
  prove_released()

  before = log_count()
  local cr, cb = project('comments-queued')
  release = gate('acceptance')
  start_comment(cr, cb, { '# AI! first queued comment', '# AI! second queued comment' })
  wait_for(function() return vim.fn.filereadable(gates .. '/acceptance.arrived') == 1 end, 'comment acceptance hold')
  comments.toggle()
  local comment_view = vim.api.nvim_get_current_buf()
  assert(view_text(comment_view):find('queued: 1', 1, true),
    'comments did not retain the second marker in its queue')
  comments.toggle()
  hide_to_main()
  refuse_hidden('comment active/queued work', 'project conversation has active or queued work')
  assert(comments.busy_reason() ~= nil, 'hidden comment work was lost after refusal')
  release()
  wait_for(function() return log_count() >= before + 2 and comments.busy_reason() == nil end, 'comment queue drain')
  prove_released()

  before = log_count()
  local hr, hb = project('help-queued')
  local second, second_path = extra_buffer(hr, 'second')
  release = gate('acceptance')
  start_help(hr, hb)
  wait_for(function() return vim.fn.filereadable(gates .. '/acceptance.arrived') == 1 end, 'help acceptance hold')
  start_help(hr, second)
  local queued = false
  for _, worker in pairs(help._workers) do
    if worker.root == hr and #worker.queue == 1 then queued = true end
  end
  if not queued then
    local states = {}
    for _, worker in pairs(help._workers) do
      states[#states + 1] = ('%s role=%s active=%s queued=%d'):format(worker.root, worker.role, tostring(worker.active ~= nil), #worker.queue)
    end
    error('help did not retain the second project selection in its queue: ' .. second_path .. ' / ' .. table.concat(states, '; '))
  end
  hide_to_main()
  refuse_hidden('help active/queued work', 'selection jobs are active or queued')
  assert(help.busy_reason() ~= nil, 'hidden selection work was lost after refusal')
  release()
  wait_for(function() return log_count() >= before + 2 and help.busy_reason() == nil end, 'help queue drain')
  prove_released()
end

local function test_chat_reset_and_stop()
  local root, buf = project('chat-reset-stop')
  show_chat(root, buf)
  run_chat_input('prime chat reset')
  wait_for(function() return chat.busy_reason() == nil end, 'chat prime')
  local release = gate('exit')
  vim.cmd.AIChatNew()
  wait_for(function() return vim.fn.filereadable(gates .. '/exit.arrived') == 1 end, 'chat reset exit hold')
  hide_to_main()
  refuse_hidden('chat reset', 'web chat has active or queued work')
  release()
  wait_idle(chat, 'chat reset release')
  prove_released()

  show_chat(root, buf)
  wait_for(function() return chat.busy_reason() == nil end, 'chat before stop')
  release = gate('exit')
  vim.cmd.AIChatStop()
  wait_for(function() return vim.fn.filereadable(gates .. '/exit.arrived') == 1 end, 'chat stop exit hold')
  hide_to_main()
  refuse_hidden('chat stop', 'web chat is connecting or exiting')
  release()
  wait_idle(chat, 'chat stop release')
  prove_released()
end

local function test_comment_reset_and_stop()
  local root, buf = project('comments-reset-stop')
  start_comment(root, buf, { '# AI! prime comments' })
  wait_idle(comments, 'comment prime')
  local release = gate('exit')
  vim.cmd.AINew()
  wait_for(function() return vim.fn.filereadable(gates .. '/exit.arrived') == 1 end, 'comment reset exit hold')
  hide_to_main()
  refuse_hidden('comment reset', 'project conversation has active or queued work')
  release()
  wait_idle(comments, 'comment reset release')
  prove_released()

  local stop_root, stop_buf = project('comments-stop')
  start_comment(stop_root, stop_buf, { '# AI! prime comments before stop' })
  wait_idle(comments, 'comment before stop')
  local release_stop = gate('exit')
  vim.cmd.AIStop()
  wait_for(function() return vim.fn.filereadable(gates .. '/exit.arrived') == 1 end, 'comment stop exit hold')
  hide_to_main()
  refuse_hidden('comment stop', 'project Pi session is connecting or exiting')
  release_stop()
  wait_idle(comments, 'comment stop release')
  prove_released()
end

local function test_help_reset_and_stop()
  local root, buf = project('help-reset')
  local release = gate('reset')
  start_help(root, buf)
  wait_for(function() return vim.fn.filereadable(gates .. '/reset.arrived') == 1 end, 'help new-session reset hold')
  hide_to_main()
  refuse_hidden('help reset', 'selection jobs are active or queued')
  release()
  wait_idle(help, 'help reset release')
  prove_released()

  local stop_root, stop_buf = project('help-stop')
  start_help(stop_root, stop_buf)
  wait_idle(help, 'help before stop')
  local worker
  for _, candidate in pairs(help._workers) do
    if candidate.root == stop_root then worker = candidate end
  end
  assert(worker and worker.session, 'help worker has no live Pi session to stop')
  local release_stop = gate('exit')
  sessions.stop(worker.session)
  wait_for(function() return vim.fn.filereadable(gates .. '/exit.arrived') == 1 end, 'help stop exit hold')
  hide_to_main()
  refuse_hidden('help stop', 'selection Pi session is connecting or exiting')
  release_stop()
  wait_idle(help, 'help stop release')
  prove_released()
end

local function test_pending_and_settled_gates()
  for _, item in ipairs({
    { name = 'chat', module = chat, start = function(root, buf) show_chat(root, buf); run_chat_input('gated chat prompt') end },
    { name = 'comments', module = comments, start = function(root, buf) start_comment(root, buf, { '# AI! gated comment prompt' }) end },
    { name = 'help', module = help, start = function(root, buf) start_help(root, buf) end },
  }) do
    for _, stage in ipairs({ 'acceptance', 'retry', 'post-settled' }) do
      local root, buf = project(item.name .. '-' .. stage)
      local before = log_count()
      local release = gate(stage)
      item.start(root, buf)
      wait_for(function() return vim.fn.filereadable(gates .. '/' .. stage .. '.arrived') == 1 end,
        item.name .. ' ' .. stage .. ' hold')
      if item.name == 'comments' and stage == 'retry' then
        comments.toggle()
        vim.cmd('normal zR') -- info events are folded by default
        local saw = view_text(vim.api.nvim_get_current_buf()):find('Pi: auto_retry_start', 1, true)
        assert(saw, 'comment workflow did not process auto_retry_start')
      elseif item.name == 'help' and stage == 'retry' then
        local saw_retry, saw_compaction = false, false
        for _, event in ipairs(observed_lifecycle_events) do
          if event.root == root and event.mode == 'selection' then
            saw_retry = saw_retry or event.type == 'auto_retry_start'
            saw_compaction = saw_compaction or event.type == 'auto_compaction_start'
          end
        end
        assert(saw_retry, 'selection workflow did not receive the fake Pi auto_retry_start event')
        assert(saw_compaction, 'selection workflow did not receive its separate compaction event')
      end
      hide_to_main()
      local reason = item.module.busy_reason()
      assert(reason, item.name .. ' became idle during ' .. stage)
      refuse_hidden(item.name .. ' ' .. stage, reason)
      assert(item.module.busy_reason(), item.name .. ' work disappeared before the ' .. stage .. ' release')
      release()
      wait_for(function() return log_count() > before and item.module.busy_reason() == nil end,
        item.name .. ' ' .. stage .. ' release')
      prove_released()
    end
  end
end

local function test_help_deferred_delivery()
  local root, buf = project('help-deferred')
  local real_mode = vim.api.nvim_get_mode
  vim.api.nvim_get_mode = function()
    if vim.api.nvim_get_current_buf() == buf then return { mode = 'i' } end
    return real_mode()
  end
  start_help(root, buf)
  local job
  wait_for(function()
    for _, candidate in pairs(help._jobs) do
      if candidate.buf == buf and candidate.state == 'ready' then job = candidate; return true end
    end
    return false
  end, 'deferred help proposal')
  assert(help.busy_reason(), 'deferred help proposal did not block profile changes')
  refuse_hidden('help deferred delivery', 'unresolved')
  vim.api.nvim_get_mode = real_mode
  vim.api.nvim_exec_autocmds('ModeChanged', {})
  wait_for(function() return job.state == 'applied' end, 'deferred proposal application')
  assert(vim.api.nvim_buf_get_lines(buf, 0, 1, false)[1] == 'ONE')
  hide_to_main()
  prove_released()
end

assert(profiles.status().active == 'workbench')
test_starting()
test_active_queued()
test_chat_reset_and_stop()
test_comment_reset_and_stop()
test_help_reset_and_stop()
test_pending_and_settled_gates()
test_help_deferred_delivery()
assert(profiles.status().active == 'workbench')
print('AI profile all-root busy-state matrix tests passed')
