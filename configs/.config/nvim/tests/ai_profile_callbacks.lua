-- Replay captured asynchronous workflow callbacks after an A→B→A profile transition.
vim.opt.rtp:append(vim.fn.getcwd())
vim.fn.delete(vim.env.AI_TEST_LOG)
require('ai').setup(dofile('tests/fixtures/ai_setup.lua').options())
local profiles = require('ai.profiles')
local chat = require('ai.chat')
local help = require('ai.help')
local rpc = require('ai.rpc')
local root = vim.env.AI_TEST_PROFILE_DIR .. '/callback-project'
vim.fn.mkdir(root, 'p')
root = assert(vim.uv.fs_realpath(root))
vim.cmd.cd(root)
local chat_path = root .. '/chat.lua'
vim.fn.writefile({ 'chat buffer' }, chat_path)
vim.cmd.edit(chat_path)
vim.bo.filetype = 'lua'

local function wait_for(fn, label)
  assert(vim.wait(10000, fn, 10), 'timed out waiting for ' .. label)
end
local function switch(name)
  local done, success, reason = false, nil, nil
  local started, err = profiles.switch(name, function(ok, why) done, success, reason = true, ok, why end)
  assert(started, tostring(err))
  wait_for(function() return done end, 'profile switch to ' .. name)
  assert(success, tostring(reason))
  wait_for(rpc.is_idle, 'retired Pi process exit')
end
local function chat_messages()
  if vim.fn.filereadable(vim.env.AI_TEST_LOG) == 0 then return {} end
  local out = {}
  for _, line in ipairs(vim.fn.readfile(vim.env.AI_TEST_LOG)) do
    local item = vim.json.decode(line)
    if item.mode == 'chat' then out[#out + 1] = item end
  end
  return out
end
local function selection_messages()
  if vim.fn.filereadable(vim.env.AI_TEST_LOG) == 0 then return {} end
  local out = {}
  for _, line in ipairs(vim.fn.readfile(vim.env.AI_TEST_LOG)) do
    local item = vim.json.decode(line)
    if item.mode == 'selection' then out[#out + 1] = item end
  end
  return out
end
local function contains(buffer, text)
  return table.concat(vim.api.nvim_buf_get_lines(buffer, 0, -1, false), '\n'):find(text, 1, true) ~= nil
end

local original_spawn, original_schedule = rpc.spawn, vim.schedule
local spawned, delayed_dispatch = {}, {}
local retired_chat_token = profiles.token()
rpc.spawn = function(cwd, args, hooks, env)
  spawned[#spawned + 1] = { cwd = cwd, args = vim.deepcopy(args), hooks = hooks }
  return original_spawn(cwd, args, hooks, env)
end
chat.toggle()
wait_for(function() return chat.busy_reason() == nil end, 'initial chat startup')
local c = assert(chat._chats[profiles.status().active .. '\n' .. root], 'chat workflow was not cached by profile and root')
local held_text = 'same queued callback text'
vim.schedule = function(callback)
  local source = debug.getinfo(callback, 'S').source
  if source:match('/lua/ai/chat%.lua$') then
    delayed_dispatch[#delayed_dispatch + 1] = callback
    return
  end
  return original_schedule(callback)
end
local old_session = c.session
c.view.submit('first callback matrix prompt')
assert(c.busy, 'first chat prompt did not occupy the session')
c.view.submit(held_text)
assert(#c.queue == 1 and type(c.queue[1]) == 'table' and c.queue[1].message == held_text,
  'second chat prompt was not retained as an individually owned queue item')
wait_for(function() return #delayed_dispatch > 0 and not c.busy end, 'held chat dispatch callback')
vim.schedule = original_schedule
assert(#chat_messages() == 1, 'held second chat prompt ran before its captured dispatch callback')
-- Remove the queued item solely to let the real profile-switch guard admit A→B→A;
-- requeue equal text after reactivation to detect mutable-owner dispatch.
table.remove(c.queue, 1)
switch('studio')
switch('workbench')
chat.toggle()
wait_for(function() return chat.busy_reason() == nil end, 'reactivated chat startup')
local new_session = c.session
assert(new_session and new_session ~= old_session, 'profile return did not create a new chat session slot')
local old_chat_hooks = spawned[1].hooks
assert(old_chat_hooks and old_chat_hooks.on_event and old_chat_hooks.on_exit, 'chat RPC callbacks were not captured')
local old_chat_view = c.view.buf
local before_replay = #chat_messages()
c.stopped = true
c.view.submit(held_text)
c.stopped = false
assert(#c.queue == 1 and type(c.queue[1]) == 'table' and c.queue[1].message == held_text,
  'reactivated chat prompt did not remain an individually owned queue item')
local replacement_item = c.queue[1]
local real_allows = profiles.allows
c.token = retired_chat_token
profiles.allows = function(token)
  if type(token) == 'table' and token.name == retired_chat_token.name
    and token.generation == retired_chat_token.generation then return true end
  return real_allows(token)
end
delayed_dispatch[1]()
assert(not c.busy and #chat_messages() == before_replay and c.queue[1] == replacement_item,
  'retired dispatch callback consumed an equal-text replacement queue item')
c.token = profiles.token()
profiles.allows = real_allows

-- Keep replacement work active while old session event/exit callbacks replay.
local gate_dir = vim.env.AI_TEST_PROFILE_DIR .. '/gates'
vim.fn.mkdir(gate_dir, 'p')
local acceptance_hold = gate_dir .. '/acceptance.hold'
vim.fn.writefile({ 'hold' }, acceptance_hold)
c.view.submit('replacement active chat prompt')
wait_for(function() return vim.fn.filereadable(gate_dir .. '/acceptance.arrived') == 1 end, 'replacement chat acceptance hold')
local replacement_request = c.active_request
assert(c.session == new_session and replacement_request and c.busy, 'replacement chat did not own an active request')
local replacement_token = c.token
c.token = retired_chat_token
profiles.allows = function(token)
  if type(token) == 'table' and token.name == retired_chat_token.name
    and token.generation == retired_chat_token.generation then return true end
  return real_allows(token)
end
old_chat_hooks.on_event({ type = 'message_end', message = { role = 'assistant', content = { { type = 'text', text = 'stale chat event' } }, stopReason = 'stop' } })
old_chat_hooks.on_exit(97, false)
c.token = replacement_token
profiles.allows = real_allows
assert(c.session == new_session and c.active_request == replacement_request and c.busy and not c.stopped,
  'retired event/exit callback changed the replacement session slot or request')
assert(#chat_messages() == before_replay and not contains(old_chat_view, 'stale chat event'),
  'retired chat event contaminated the active replacement view')
c.queue = {}
vim.fn.delete(acceptance_hold)
wait_for(function() return vim.fn.filereadable(gate_dir .. '/acceptance.arrived') == 0 end, 'replacement chat acceptance release')
wait_for(function() return #chat_messages() == before_replay + 1 and not c.busy end, 'replacement chat completion')
chat.stop()
wait_for(rpc.is_idle, 'chat cleanup')

local sessions = require('ai.session')
local real_check_state = sessions.check_state
local held_selection_state_completion, retired_selection_session
sessions.check_state = function(session, callback)
  if session.mode == 'selection' and session.ready and not held_selection_state_completion then
    return real_check_state(session, function(valid, state_err)
      retired_selection_session = session
      held_selection_state_completion = function() callback(valid, state_err) end
      callback(valid, state_err)
    end)
  end
  return real_check_state(session, callback)
end
local selection_path = root .. '/selection.lua'
local selection_buf, job
local capture_ok, capture_error = pcall(function()
  vim.fn.writefile({ 'one' }, selection_path)
  vim.cmd.edit(selection_path)
  vim.bo.filetype = 'lua'
  vim.cmd('1AIHelp UPPER')
  selection_buf = vim.api.nvim_get_current_buf()
  job = help._jobs[#help._jobs]
  wait_for(function() return job and job.state == 'applied' and held_selection_state_completion ~= nil end,
    'selection reset state-check completion and apply')
end)
sessions.check_state = real_check_state
assert(capture_ok, tostring(capture_error))
assert(retired_selection_session and held_selection_state_completion,
  'a real completed selection state check was not captured')
local selection_hooks
for _, created in ipairs(spawned) do
  for index, arg in ipairs(created.args) do
    if arg == '--tools' and created.args[index + 1] == 'read,grep,find,ls,replace_selection' then
      selection_hooks = created.hooks
    end
  end
end
assert(selection_hooks and selection_hooks.on_event and selection_hooks.on_exit, 'selection RPC callbacks were not captured')
local before_selection_replay = #selection_messages()
local selection_window = vim.api.nvim_get_current_win()
require('ai.comments').toggle()
local selection_view_name = ('ai://workbench:project/project/%s'):format(vim.fn.sha256(root))
local selection_view_buf = vim.fn.bufnr(selection_view_name)
assert(selection_view_buf > 0 and vim.api.nvim_buf_is_valid(selection_view_buf), 'selection project history view was not created')
vim.api.nvim_set_current_win(selection_window)
switch('studio')
switch('workbench')
local selection_gate = gate_dir .. '/acceptance.hold'
vim.fn.writefile({ 'hold' }, selection_gate)
vim.api.nvim_set_current_buf(selection_buf)
vim.cmd('1AIHelp REPLACE:replacement-selection')
local replacement_job = help._jobs[#help._jobs]
wait_for(function() return vim.fn.filereadable(gate_dir .. '/acceptance.arrived') == 1 end,
  'replacement selection acceptance hold')
local replacement_worker
for _, candidate in pairs(help._workers) do
  if candidate.root == root and candidate.role == replacement_job.role then replacement_worker = candidate end
end
assert(replacement_worker and replacement_worker.active == replacement_job and replacement_worker.session,
  'replacement selection did not own its worker/session slot')
local replacement_selection_session = replacement_worker.session
vim.cmd('1AIHelp REPLACE:queued-replacement-selection')
local queued_replacement_job = help._jobs[#help._jobs]
assert(replacement_worker.queue[1] == queued_replacement_job and queued_replacement_job.state == 'queued',
  'replacement selection queue slot was not occupied')
local replacement_answer_before = replacement_job.answer
local replacement_buffer_before = vim.api.nvim_buf_get_lines(selection_buf, 0, -1, false)
local selection_view_before = vim.api.nvim_buf_get_lines(selection_view_buf, 0, -1, false)
local replacement_job_count = #help._jobs
local retired_session_sends = {}
local real_send = sessions.send
local replay_ok, replay_err = pcall(function()
  sessions.send = function(session, command, callback)
    if session == retired_selection_session then
      retired_session_sends[#retired_session_sends + 1] = command.type
    end
    return real_send(session, command, callback)
  end
  held_selection_state_completion()
end)
sessions.send = real_send
assert(replay_ok, tostring(replay_err))
selection_hooks.on_event({ type = 'message_end', message = { role = 'assistant', content = { { type = 'text', text = 'stale selection event' } }, stopReason = 'stop' } })
assert(replacement_job.answer == replacement_answer_before,
  'retired selection message_end contaminated the replacement answer')
selection_hooks.on_exit(98, false)
vim.wait(150, function() return false end, 10)
assert(#retired_session_sends == 0, 'retired state-check completion attempted a prompt/send on its old session')
assert(replacement_worker.active == replacement_job and replacement_worker.session == replacement_selection_session
    and replacement_worker.queue[1] == queued_replacement_job and replacement_job.state == 'running'
    and queued_replacement_job.state == 'queued' and #help._jobs == replacement_job_count,
  'retired reset/event/exit callback replaced, completed, or requeued current selection work')
assert(vim.deep_equal(vim.api.nvim_buf_get_lines(selection_buf, 0, -1, false), replacement_buffer_before),
  'retired selection callback changed the replacement buffer')
assert(vim.api.nvim_buf_is_valid(selection_view_buf)
    and vim.deep_equal(vim.api.nvim_buf_get_lines(selection_view_buf, 0, -1, false), selection_view_before),
  'retired selection callback changed the project history view')
assert(#selection_messages() == before_selection_replay,
  'retired reset callback dispatched another selection prompt during replacement work')
queued_replacement_job.state = 'discarded'
replacement_worker.queue = {}
vim.fn.delete(selection_gate)
wait_for(function() return vim.fn.filereadable(gate_dir .. '/acceptance.arrived') == 0 end, 'replacement selection acceptance release')
wait_for(function() return replacement_job.state == 'applied' end, 'replacement selection completion')
assert(not contains(selection_view_buf, 'stale selection event'),
  'completed replacement selection history contains a retired message_end answer')

-- A scheduled FIFO dispatch from the retired worker must not consume a new job
-- occupying the same queue slot after the profile returns A→B→A.
local real_schedule = vim.schedule
local held_help_dispatches = {}
local retired_help_token = profiles.token()
vim.schedule = function(callback)
  local info = debug.getinfo(callback, 'S')
  if info.source:match('/lua/ai/help%.lua$') and info.linedefined > 100 then
    held_help_dispatches[#held_help_dispatches + 1] = callback
    return
  end
  return real_schedule(callback)
end
vim.fn.mkdir(gate_dir, 'p')
local help_gate = gate_dir .. '/acceptance.hold'
vim.fn.writefile({ 'hold' }, help_gate)
vim.api.nvim_set_current_buf(selection_buf)
vim.cmd('1AIHelp REPLACE:first-scheduled-dispatch')
local first_dispatch_job = help._jobs[#help._jobs]
wait_for(function() return vim.fn.filereadable(gate_dir .. '/acceptance.arrived') == 1 end,
  'first help scheduled-dispatch acceptance')
vim.cmd('1AIHelp REPLACE:retired-queued-dispatch')
local retired_queued_job = help._jobs[#help._jobs]
local help_worker
for _, candidate in pairs(help._workers) do
  if candidate.root == root and candidate.role == first_dispatch_job.role then help_worker = candidate end
end
assert(help_worker and help_worker.active == first_dispatch_job and help_worker.queue[1] == retired_queued_job)
vim.fn.delete(help_gate)
wait_for(function() return vim.fn.filereadable(gate_dir .. '/acceptance.arrived') == 0 end,
  'first help scheduled-dispatch acceptance release')
wait_for(function() return first_dispatch_job.state == 'applied' and help_worker.active == nil
  and #held_help_dispatches > 0 end, 'held help scheduled-dispatch callback')
vim.schedule = real_schedule
retired_queued_job.state = 'discarded'
help_worker.queue = {}
switch('studio')
switch('workbench')
local replacement_help_gate = gate_dir .. '/acceptance.hold'
vim.fn.writefile({ 'hold' }, replacement_help_gate)
vim.api.nvim_set_current_buf(selection_buf)
vim.cmd('1AIHelp REPLACE:replacement-active-dispatch')
local active_replacement_job = help._jobs[#help._jobs]
wait_for(function() return vim.fn.filereadable(gate_dir .. '/acceptance.arrived') == 1 end,
  'replacement help active-dispatch acceptance')
vim.cmd('1AIHelp REPLACE:replacement-queued-dispatch')
local queued_replacement_job = help._jobs[#help._jobs]
assert(help_worker.active == active_replacement_job and help_worker.queue[1] == queued_replacement_job)
local active_slot = help_worker.active
local replacement_help_token = help_worker.token
help_worker.active = nil
help_worker.token = retired_help_token
local real_allows = profiles.allows
profiles.allows = function(token)
  if type(token) == 'table' and token.name == retired_help_token.name
    and token.generation == retired_help_token.generation then return true end
  return real_allows(token)
end
held_help_dispatches[1]()
local stale_dispatch_active = help_worker.active
help_worker.active = active_slot
help_worker.token = replacement_help_token
profiles.allows = real_allows
assert(stale_dispatch_active == nil and help_worker.queue[1] == queued_replacement_job
    and active_replacement_job.state == 'running',
  'retired scheduled help dispatch consumed a new-generation replacement queue job')
queued_replacement_job.state = 'discarded'
help_worker.queue = {}
vim.fn.delete(replacement_help_gate)
wait_for(function() return vim.fn.filereadable(gate_dir .. '/acceptance.arrived') == 0 end,
  'replacement help active-dispatch acceptance release')
wait_for(function() return active_replacement_job.state == 'applied' end,
  'replacement help active-dispatch completion')
switch('studio')
switch('workbench')
rpc.spawn = original_spawn
chat.stop()
wait_for(rpc.is_idle, 'callback matrix cleanup')
print('AI profile callback ownership matrix tests passed')
