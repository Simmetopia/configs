-- Run: AI_TEST_LOG=/tmp/ai-comments-test.log PATH="$PWD/tests/bin:$PATH" nvim --headless -u NONE -l tests/ai_comments.lua
vim.opt.rtp:append(vim.fn.getcwd())
local core = require('ai.comments.markers')
local scanner = require('ai.comments.scanner')
local function eq(a, b) assert(vim.deep_equal(a, b), vim.inspect({ expected = b, actual = a })) end
local function wait_for(fn)
  assert(vim.wait(6000, fn, 20), 'timed out waiting for RPC event')
end
local function log()
  if vim.fn.filereadable(vim.env.AI_TEST_LOG) == 0 then return {} end
  local records = {}
  for _, line in ipairs(vim.fn.readfile(vim.env.AI_TEST_LOG)) do
    records[#records + 1] = vim.json.decode(line)
  end
  return records
end
local function file(name, text)
  local path = vim.fn.getcwd() .. '/' .. name
  vim.fn.writefile(vim.split(text, '\n', { plain = true }), path)
  vim.cmd.edit(path)
  vim.bo.filetype = 'python'
  return vim.api.nvim_get_current_buf(), path
end
local function save(text)
  local buf = vim.api.nvim_get_current_buf()
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, vim.split(text, '\n', { plain = true }))
  vim.cmd.write()
end
local function comment_project(root)
  local comments = require('ai.comments')
  for _, owner in ipairs({ comments.toggle, comments.busy_reason, comments.retire }) do
    for index = 1, 20 do
      local name, value = debug.getupvalue(owner, index)
      if not name then break end
      if name == 'projects' then return value[require('ai.profiles').current().name .. '\n' .. root] end
    end
  end
  error('could not locate the saved-comment project for callback ownership checks')
end

eq(core.parse('value = 1  # fix null AI!', 'python').instruction, 'fix null')
eq(core.parse(' // AI? why?', 'javascript').kind, '?')
eq(core.parse(' // AI?? why?', 'javascript').kind, '??')
eq(core.parse('x = 1 # AI!! fix it', 'python').kind, '!!')
eq(core.parse('; examine AI??', 'lisp').kind, '??')
eq(core.parse('-- aI!! change', 'lua').kind, '!!')
eq(core.parse('# AI!!! invalid', 'python'), nil)
eq(core.parse('# AI!? invalid', 'python'), nil)
eq(core.parse('-- Ai. extra context', 'lua').kind, '.')
eq(core.parse('; check AI?', 'lisp').instruction, 'check')
eq(core.parse('OpenAI is not a marker # hello', 'python'), nil)
eq(core.parse('# AI! one', 'python').kind, '!')
eq(core.parse('name = "OpenAI!"', 'python'), nil)
eq(core.parse('name = " # AI! no"', 'python'), nil)
eq(core.parse_comment('// note // AI! buried', 'typescript'), nil)
eq(core.scan({ '# AI. context', '# AI! do work' }, 'python')[1].context, 'context')
local ts_lines = {
  'local text = [[ -- AI! not a comment ]]',
  '-- AI. nearby context',
  'local value = 1-- AI!! real comment',
  '--[[ AI? block comments are not line comments ]]',
}
local ts_buf = vim.api.nvim_create_buf(false, true)
vim.bo[ts_buf].filetype = 'lua'
vim.api.nvim_buf_set_lines(ts_buf, 0, -1, false, ts_lines)
local ts_markers, ts_source = scanner.scan(ts_buf, ts_lines, 'lua')
eq(ts_source, 'treesitter')
eq(#ts_markers, 1)
eq(ts_markers[1].instruction, 'real comment')
eq(ts_markers[1].kind, '!!')
eq(ts_markers[1].number, 3)
eq(ts_markers[1].context, 'nearby context')
eq(core.cleanup_line(ts_lines, ts_markers[1])[3], 'local value = 1')
eq(core.scan(ts_lines, 'lua')[1].instruction, 'not a comment ]]')
local get_parser = vim.treesitter.get_parser
vim.treesitter.get_parser = function() error('parser unavailable') end
local fallback, source = scanner.scan(ts_buf, ts_lines, 'lua')
vim.treesitter.get_parser = get_parser
eq(source, 'fallback')
eq(#fallback, #core.scan(ts_lines, 'lua'))
eq(fallback[1].instruction, 'not a comment ]]')
vim.api.nvim_buf_delete(ts_buf, { force = true })
if vim.treesitter.language.add('typescript') then
  local typescript_lines = { 'const url = "// AI! fake"', '/* AI? ignored */', 'const value = 1// AI?? actual question' }
  local typescript_buf = vim.api.nvim_create_buf(false, true)
  vim.bo[typescript_buf].filetype = 'typescript'
  vim.api.nvim_buf_set_lines(typescript_buf, 0, -1, false, typescript_lines)
  local typescript_markers, typescript_source = scanner.scan(typescript_buf, typescript_lines, 'typescript')
  eq(typescript_source, 'treesitter')
  eq(#typescript_markers, 1)
  eq(typescript_markers[1].kind, '??')
  eq(typescript_markers[1].number, 3)
  eq(core.cleanup_line(typescript_lines, typescript_markers[1])[3], 'const value = 1')
  vim.api.nvim_buf_delete(typescript_buf, { force = true })
end
eq(core.cleanup_line({ 'x = 1 # fix AI!' }, { number = 1, line = 'x = 1 # fix AI!', comment_at = 7 }), { 'x = 1' })
eq(core.cleanup_line({ 'changed' }, { number = 1, line = 'old', comment_at = 1 }), nil)
local parser, records, errors = { pending = '' }, {}, 0
local function feed(chunk)
  require('ai.protocol').feed(parser, chunk, function(r) records[#records + 1] = r end, function() errors = errors + 1 end)
end
feed('{"id":1}\r\nnot-json\n{"msg":"a')
feed('\\u2028b"}\n')
eq(#records, 2)
eq(errors, 1)
eq(records[2].msg, 'a\u{2028}b')
local queue, seen = {}, {}
assert(core.enqueue(queue, seen, { key = 'a' }))
assert(not core.enqueue(queue, seen, { key = 'a' }))
assert(core.enqueue(queue, seen, { key = 'b' }))
eq(core.pop(queue).key, 'a')
eq(core.pop(queue).key, 'b')

require('ai').setup(dofile('tests/fixtures/ai_setup.lua').options())
assert(vim.fn.maparg('<leader>aip', 'n') ~= '') -- config sets leader to space in normal use
vim.fn.delete(vim.env.AI_TEST_LOG)
local buf, path = file('ai_comments_test_' .. vim.uv.hrtime() .. '.py', '# first AI!')
save('# first AI!')
local refused, refusal
require('ai.profiles').switch('studio', function(ok, why) refused, refusal = ok, why end)
assert(refused == false and refusal:find('project conversation has active or queued work', 1, true))
assert(require('ai.profiles').status().active == 'workbench')
wait_for(function() return #log() == 1 end)
do -- the dispatched marker appears as a labelled user message (marker from lines 117-118: '# first AI!', line 1)
  local first_root, first_path = require('ai.project').for_buffer(buf)
  local expected_label = 'AI! ' .. first_path:sub(#first_root + 2) .. ':1'
  local first_project = comment_project(first_root)
  wait_for(function()
    for _, e in ipairs(require('ai.ui.view').entries(first_project.view)) do
      if e.kind == 'message' and e.role == 'user' and e.label == expected_label and e.text == 'first' then return true end
    end
  end)
end
save('# first AI!')
save('# changed AI!')
save('x = 1 # question AI?')
wait_for(function() return #log() == 3 end)
eq(log()[1].mode, 'edit')
eq(log()[2].mode, 'edit')
eq(log()[3].mode, 'question')
eq(log()[1].model, 'gpt-6-luna-2026-09-22')
eq(log()[3].model, 'gpt-6-luna-2026-09-22')
assert(log()[1].session_id ~= log()[3].session_id)
wait_for(function() return vim.fn.readfile(path)[1] == 'x = 1 # question AI?' or vim.fn.readfile(path)[1] == 'x = 1' end)
vim.cmd.AIToggle()
local win = vim.api.nvim_get_current_win()
vim.cmd.AIToggle()
assert(not vim.api.nvim_win_is_valid(win))
vim.cmd.AIToggle()
assert(vim.api.nvim_win_is_valid(vim.api.nvim_get_current_win()))
vim.cmd.AIToggle()
wait_for(function() return vim.fn.readfile(path)[1] == 'x = 1' end)
save('# agent-edits AI!')
wait_for(function() return #log() == 4 end)
wait_for(function() return table.concat(vim.fn.readfile(path), '\n'):find('changed by agent', 1, true) ~= nil end)
wait_for(function() return not table.concat(vim.fn.readfile(path), '\n'):find('agent-edits', 1, true) end)
save('# conflict AI!')
wait_for(function() return #log() == 5 end)
vim.api.nvim_buf_set_lines(buf, 0, -1, false, { '# unsaved user edit' })
wait_for(function() return vim.fn.readfile(path)[1] == '# conflict AI!' end)
vim.wait(450)
eq(vim.api.nvim_buf_get_lines(buf, 0, 1, false)[1], '# unsaved user edit')
eq(vim.fn.readfile(path)[1], '# conflict AI!')
vim.cmd.AIStop()
vim.wait(150)
vim.cmd.AIRestart()
vim.wait(150)
vim.cmd.edit({ bang = true })
save('# process-exits AI!')
wait_for(function() return #log() == 6 end)
vim.wait(450)
-- Restart requires all tier sessions to exit, including the default Opus session.
vim.cmd.AIStop()
vim.wait(150)
vim.cmd.AIRestart()
vim.wait(150)
vim.cmd.AIToggle()
local conversation = vim.api.nvim_get_current_buf()
for _, map in ipairs(vim.api.nvim_buf_get_keymap(conversation, 'n')) do
  if map.lhs == 'i' then map.callback(); break end
end
local input = vim.api.nvim_get_current_buf()
vim.api.nvim_buf_set_lines(input, 0, -1, false, { 'ordinary prompt from float' })
for _, map in ipairs(vim.api.nvim_buf_get_keymap(input, 'i')) do
  if map.lhs == '<CR>' then map.callback(); break end
end
wait_for(function() return #log() == 7 end)
eq(log()[7].message, 'Current buffer file: ' .. vim.json.encode(vim.uv.fs_realpath(path))
  .. '\n\nordinary prompt from float')
eq(log()[7].mode, 'edit')
eq(log()[7].provider, 'lego-openai')
eq(log()[7].model, 'gpt-6-luna-2026-09-22')
eq(log()[7].thinking, 'high')
eq(log()[7].session_id, log()[6].session_id, 'manual prompts share the cheap edit identity')
vim.wait(350)
vim.cmd.AIToggle()
save('# complex edit AI!!')
save('value = 1 # detailed question AI??')
wait_for(function() return #log() == 9 end)
eq(log()[8].mode, 'edit')
eq(log()[8].provider, 'lego-anthropic')
eq(log()[8].model, 'eu.anthropic.claude-opus-5-5')
eq(log()[8].thinking, 'medium')
assert(log()[8].session_id ~= log()[7].session_id, 'expensive marker has an independent role identity')
eq(log()[9].mode, 'question')
eq(log()[9].model, 'eu.anthropic.claude-opus-5-5')
eq(log()[9].thinking, 'medium')
assert(log()[8].session_id ~= log()[9].session_id)
assert(log()[8].session_id ~= log()[1].session_id)
assert(log()[9].session_id ~= log()[3].session_id)
wait_for(function() return vim.fn.readfile(path)[1] == 'value = 1' end)
local scratch = vim.api.nvim_create_buf(false, true)
vim.bo[scratch].buftype = 'nofile'
vim.api.nvim_buf_set_lines(scratch, 0, -1, false, { '# ignored AI!' })
vim.api.nvim_exec_autocmds('BufWritePost', { buffer = scratch })
local outside = vim.fn.tempname() .. '.py'
vim.fn.writefile({ '# ignored outside AI!' }, outside)
vim.cmd.edit(outside)
vim.bo.filetype = 'python'
vim.cmd.write()
vim.wait(100)
eq(#log(), 9)
vim.api.nvim_buf_delete(vim.api.nvim_get_current_buf(), { force = true })
vim.fn.delete(outside)
vim.api.nvim_buf_delete(scratch, { force = true })
local lua_buf, lua_path = file('ai_comments_test_' .. vim.uv.hrtime() .. '.lua', 'local text = [[ -- AI! fake ]]')
vim.bo.filetype = 'lua'
save('local text = [[ -- AI! fake ]]')
vim.wait(100)
eq(#log(), 9)
save('local value = 1-- AI! real')
wait_for(function() return #log() == 10 end)
eq(log()[10].model, 'gpt-6-luna-2026-09-22')
wait_for(function() return vim.fn.readfile(lua_path)[1] == 'local value = 1' end)
save('local value = 1 -- unrecovered-tool AI!')
wait_for(function() return #log() == 11 end)
vim.wait(350)
eq(vim.fn.readfile(lua_path)[1], 'local value = 1 -- unrecovered-tool AI!')
save('local value = 1 -- unrecovered-tool AI!')
wait_for(function() return #log() == 12 end)
vim.wait(350)
eq(vim.fn.readfile(lua_path)[1], 'local value = 1 -- unrecovered-tool AI!')
assert(vim.fn.maparg('<leader>aip', 'n') ~= '')

-- A marker saved during retirement remains on disk and is retried after an explicit resave.
local calls_before_transition = #log()
vim.api.nvim_set_current_buf(buf)
vim.api.nvim_buf_set_lines(buf, 0, -1, false, { '# transition-save AI!' })
local switched, switch_ok = false, nil
assert(require('ai.profiles').switch('studio', function(ok) switched, switch_ok = true, ok end))
assert(require('ai.profiles').status().phase == 'switching')
local original_notify, transition_notice = vim.notify, nil
vim.notify = function(text) if tostring(text):lower():find('profile transition', 1, true) then transition_notice = tostring(text) end end
vim.cmd.write()
wait_for(function() return switched end)
vim.notify = original_notify
assert(switch_ok and require('ai.profiles').status().active == 'studio')
assert(transition_notice and transition_notice:find('resave', 1, true), 'transition save must explain that the retained marker needs resaving')
assert(#log() == calls_before_transition, 'transition save must not dispatch through a retired profile')
eq(vim.fn.readfile(path), { '# transition-save AI!' })
vim.api.nvim_buf_set_lines(buf, 0, -1, false, { '# transition-save AI!', 'value = 1' })
vim.cmd.write()
wait_for(function() return #log() == calls_before_transition + 1 end)
wait_for(function() return vim.deep_equal(vim.fn.readfile(path), { 'value = 1' }) end)

-- A profile cached before this marker is handled must consult the shared root ledger on resave.
local retained_buf, retained_path = file('ai_comments_test_' .. vim.uv.hrtime() .. '.py', 'value = 1')
local project_root = assert(require('ai.project').for_buffer(retained_buf))
require('ai.comments').log(project_root, require('ai.ui.timeline').event('info', 'cache studio before marker handling'), 'studio')
local function switch_to(name)
  local completed, success = false, false
  assert(require('ai.profiles').switch(name, function(ok) completed, success = true, ok end))
  wait_for(function() return completed end)
  assert(success, 'profile switch to ' .. name .. ' failed')
  wait_for(function() return require('ai.rpc').is_idle() end)
end
switch_to('workbench')
vim.api.nvim_set_current_buf(retained_buf)
local retained_marker = '# cached cross-profile AI!'
local calls_before_retained = #log()
save(retained_marker)
vim.bo[retained_buf].modified = true -- Retain the saved marker while allowing its request to settle.
wait_for(function() return #log() == calls_before_retained + 1 and require('ai.comments').busy_reason() == nil end)
local retained_key = vim.fn.sha256(core.key(assert(vim.uv.fs_realpath(retained_path)), core.scan({ retained_marker }, 'python')[1]))
assert(require('ai.comments.storage').load(project_root)[retained_key], 'successful retained marker must enter the shared root ledger')
assert(vim.deep_equal(vim.fn.readfile(retained_path), { retained_marker }))
switch_to('studio')
vim.api.nvim_set_current_buf(retained_buf)
vim.api.nvim_buf_set_lines(retained_buf, 0, -1, false, { retained_marker })
vim.bo[retained_buf].modified = false
vim.cmd.write()
assert(#log() == calls_before_retained + 1, 'cached studio project replayed a marker handled by workbench')
switch_to('workbench')
vim.api.nvim_set_current_buf(retained_buf)
vim.cmd.write()
assert(#log() == calls_before_retained + 1, 'resaving in the original profile replayed a retained marker')

local function has_event(v, text)
  for _, e in ipairs(require('ai.ui.view').entries(v)) do if e.kind == 'event' and e.text == text then return true end end
end
-- A delayed abort response from profile A cannot mutate its cached view after A→B→A.
local held_abort
local real_send = require('ai.session').send
require('ai.session').send = function(session, command, callback)
  if command.type == 'abort' then
    return real_send(session, command, function(response)
      held_abort = function() callback(response) end
    end)
  end
  return real_send(session, command, callback)
end
vim.fn.writefile({ 'fail' }, vim.env.AI_TEST_ABORT_FAIL_FILE)
local abort_buf, abort_path = file('ai_comments_abort_callback_' .. vim.uv.hrtime() .. '.py', '# abort callback AI!')
local abort_before = #log()
vim.cmd.write()
wait_for(function() return #log() == abort_before + 1 end)
local abort_root = assert(require('ai.project').for_buffer(abort_buf))
local abort_project = assert(comment_project(abort_root))
local retired_abort_item = assert(abort_project.active, 'abort test must capture the active marker item')
local retired_abort_session = assert(retired_abort_item.session)
local retired_abort_token = require('ai.profiles').token()
require('ai.comments').abort()
wait_for(function() return held_abort ~= nil and require('ai.comments').busy_reason() == nil end)
require('ai.session').send = real_send
switch_to('studio')
switch_to('workbench')
require('ai.comments').toggle() -- reactivates the cached project with profile A's new generation
vim.api.nvim_set_current_buf(abort_buf)
local abort_gates = vim.env.AI_TEST_PROFILE_DIR .. '/gates'
vim.fn.mkdir(abort_gates, 'p')
local abort_acceptance_hold = abort_gates .. '/acceptance.hold'
vim.fn.writefile({ 'hold' }, abort_acceptance_hold)
vim.api.nvim_buf_set_lines(abort_buf, 0, -1, false, { '# replacement abort callback AI!' })
vim.bo[abort_buf].modified = true
vim.cmd.write()
wait_for(function() return vim.fn.filereadable(abort_gates .. '/acceptance.arrived') == 1 end)
local replacement_abort_item = assert(abort_project.active)
local replacement_abort_session = assert(replacement_abort_item.session)
local replacement_abort_token = abort_project.token
assert(replacement_abort_item ~= retired_abort_item and replacement_abort_session ~= retired_abort_session)
local real_allows = require('ai.profiles').allows
local profiles = require('ai.profiles')
abort_project.token = retired_abort_token
profiles.allows = function(token)
  if type(token) == 'table' and token.name == retired_abort_token.name
    and token.generation == retired_abort_token.generation then return true end
  return real_allows(token)
end
-- Restore the old session slot while the replacement item remains active: only
-- the active-item identity check can reject this stale abort response.
abort_project.sessions[retired_abort_item.mode .. ':' .. retired_abort_item.role] = retired_abort_session
held_abort()
assert(abort_project.active == replacement_abort_item and not has_event(abort_project.view, 'Abort failed; use :AIStop'),
  'retired abort response mutated the active replacement item despite an old session slot')
-- Restore the old active item while keeping the replacement session slot: only
-- the exact session-slot check can reject this stale response.
abort_project.active = retired_abort_item
abort_project.sessions[retired_abort_item.mode .. ':' .. retired_abort_item.role] = replacement_abort_session
held_abort()
abort_project.active = replacement_abort_item
abort_project.sessions[retired_abort_item.mode .. ':' .. retired_abort_item.role] = replacement_abort_session
abort_project.token = replacement_abort_token
profiles.allows = real_allows
assert(not has_event(abort_project.view, 'Abort failed; use :AIStop'),
  'retired abort response contaminated the reactivated project view')
vim.fn.delete(abort_acceptance_hold)
wait_for(function() return vim.fn.filereadable(abort_gates .. '/acceptance.arrived') == 0 end)
wait_for(function() return #log() == abort_before + 2 and require('ai.comments').busy_reason() == nil end)
require('ai.comments').toggle()
vim.fn.delete(vim.env.AI_TEST_ABORT_FAIL_FILE)

-- A held finish callback from comments cannot dispatch a new equal-purpose item
-- after A→B→A even if a test restores the retired token as the current owner.
local original_schedule = vim.schedule
local held_comment_dispatches = {}
local retired_comment_token = abort_project.token
vim.schedule = function(callback)
  local source = debug.getinfo(callback, 'S').source
  if source:match('/lua/ai/comments/init%.lua$') then
    held_comment_dispatches[#held_comment_dispatches + 1] = callback
    return
  end
  return original_schedule(callback)
end
local scheduled_before = #log()
local scheduled_gate = abort_gates .. '/acceptance.hold'
vim.fn.writefile({ 'hold' }, scheduled_gate)
abort_project.view.submit('comments first scheduled callback prompt')
wait_for(function() return vim.fn.filereadable(abort_gates .. '/acceptance.arrived') == 1 end)
abort_project.view.submit('same replacement queue text')
assert(#abort_project.queue == 1, 'comments did not queue the item owned by the delayed finish callback')
local retired_queue_item = abort_project.queue[1]
vim.fn.delete(scheduled_gate)
wait_for(function() return vim.fn.filereadable(abort_gates .. '/acceptance.arrived') == 0 end)
wait_for(function() return #log() == scheduled_before + 1 and abort_project.active == nil end)
vim.schedule = original_schedule
assert(#held_comment_dispatches > 0, 'comments finish did not hold its scheduled-dispatch callback')
abort_project.queue = {}
abort_project.seen[retired_queue_item.key] = nil
switch_to('studio')
switch_to('workbench')
require('ai.comments').toggle()
require('ai.comments').new()
local scheduled_session_key = 'edit:' .. require('ai.config').options.comments.prompt_role
wait_for(function() return abort_project.sessions[scheduled_session_key]
  and abort_project.sessions[scheduled_session_key].ready end)
abort_project.paused = true
abort_project.view.submit('same replacement queue text')
local replacement_queue_item = abort_project.queue[1]
assert(replacement_queue_item and replacement_queue_item ~= retired_queue_item,
  'A→B→A comments did not create an independently owned replacement queue item')
local replacement_comment_token = abort_project.token
local real_allows = require('ai.profiles').allows
local profiles = require('ai.profiles')
abort_project.token = retired_comment_token
abort_project.paused = false
profiles.allows = function(token)
  if type(token) == 'table' and token.name == retired_comment_token.name
    and token.generation == retired_comment_token.generation then return true end
  return real_allows(token)
end
held_comment_dispatches[1]()
abort_project.token = replacement_comment_token
profiles.allows = real_allows
assert(abort_project.active == nil and abort_project.queue[1] == replacement_queue_item,
  'retired comments dispatch callback consumed a new-generation replacement queue item')
abort_project.queue = {}
abort_project.seen[replacement_queue_item.key] = nil
require('ai.comments').stop()
wait_for(function() return require('ai.rpc').is_idle() end)

vim.cmd.AIStop()
vim.api.nvim_buf_delete(lua_buf, { force = true })
vim.fn.delete(lua_path)
vim.api.nvim_buf_delete(retained_buf, { force = true })
vim.fn.delete(retained_path)
vim.api.nvim_buf_delete(abort_buf, { force = true })
vim.fn.delete(abort_path)
vim.api.nvim_buf_delete(buf, { force = true })
vim.fn.delete(path)
vim.fn.delete(vim.env.AI_TEST_LOG)
print('AI comments tests passed')
