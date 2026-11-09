-- Run: nvim --headless -u NONE -l tests/ai_profiles.lua
vim.opt.rtp:append(vim.fn.getcwd())
local config = require('ai.config')
local profiles = require('ai.profiles')
local fixture = dofile('tests/fixtures/ai_setup.lua')
local root = assert(vim.env.AI_TEST_PROFILE_DIR)
local source = root .. '/models-source.json'

local function options(name)
  local value = fixture.options()
  value.profiles.workbench.agent_dir = root .. '/' .. name
  config.setup(value)
  return config.profile('workbench')
end

local function rejected(profile, expected)
  local ok, err = profiles.prepare(profile)
  assert(not ok, 'expected profile preparation to fail')
  if expected then assert(tostring(err):find(expected, 1, true), tostring(err)) end
end

-- canonical_alias_and_terminal_reuse
local base = root .. '/canonical'
vim.fn.mkdir(base, 'p')
local alias = base .. '-alias'
assert(vim.uv.fs_symlink(base, alias, { dir = true }))
local opts = fixture.options()
opts.profiles.workbench.agent_dir = alias .. '/profile'
opts.profiles.studio.agent_dir = base .. '/profile'
config.setup(opts)
rejected(config.profile('workbench'), 'duplicate')
opts = fixture.options()
opts.profiles.workbench.agent_dir = alias .. '/terminal'
config.setup(opts)
local previous_terminal = vim.env.PI_CODING_AGENT_DIR
vim.env.PI_CODING_AGENT_DIR = base .. '/terminal'
rejected(config.profile('workbench'), 'terminal')
vim.env.PI_CODING_AGENT_DIR = previous_terminal

-- prepare_absent_and_same_link
local absent = options('prepare-absent')
assert(vim.fn.isdirectory(absent.agent_dir) == 0)
assert(profiles.prepare(absent))
assert(vim.fn.isdirectory(absent.agent_dir) == 1)
local link = absent.agent_dir .. '/models.json'
assert(vim.uv.fs_lstat(link).type == 'link')
assert(vim.uv.fs_realpath(link) == vim.uv.fs_realpath(source))
assert(profiles.prepare(absent))

-- prepare_conflicts_preserve_bytes: regular file, directory, dangling link, different link
local regular = options('prepare-regular-conflict')
vim.fn.mkdir(regular.agent_dir, 'p')
local path = regular.agent_dir .. '/models.json'
vim.fn.writefile({ 'user bytes' }, path)
rejected(regular, 'models.json')
assert(table.concat(vim.fn.readfile(path), '\n') == 'user bytes')

local directory = options('prepare-directory-conflict')
vim.fn.mkdir(directory.agent_dir .. '/models.json', 'p')
rejected(directory, 'models.json')
assert(vim.fn.isdirectory(directory.agent_dir .. '/models.json') == 1)

local dangling = options('prepare-dangling-conflict')
vim.fn.mkdir(dangling.agent_dir, 'p')
path = dangling.agent_dir .. '/models.json'
assert(vim.uv.fs_symlink(root .. '/missing-source.json', path))
local dangling_target = vim.uv.fs_readlink(path)
rejected(dangling, 'models.json')
assert(vim.uv.fs_readlink(path) == dangling_target)

local source_link = root .. '/models-source-link.json'
assert(vim.uv.fs_symlink(source, source_link))
local linked_source = options('prepare-source-link')
linked_source.models_file = source_link
assert(profiles.prepare(linked_source))
assert(vim.uv.fs_realpath(linked_source.agent_dir .. '/models.json') == vim.uv.fs_realpath(source))

local nonregular_source = options('prepare-nonregular-source')
nonregular_source.models_file = root
local ok, err = profiles.prepare(nonregular_source)
assert(not ok and tostring(err):find('regular file', 1, true), tostring(err))
assert(vim.uv.fs_lstat(nonregular_source.agent_dir) == nil, 'invalid source must not create the profile directory')

local unreadable_path = root .. '/unreadable-models.json'
vim.fn.writefile({ 'unreadable bytes' }, unreadable_path)
assert(vim.uv.fs_chmod(unreadable_path, 0))
local unreadable = options('prepare-unreadable-source')
unreadable.models_file = unreadable_path
ok, err = profiles.prepare(unreadable)
assert(not ok and tostring(err):find('readable regular file', 1, true), tostring(err))
assert(vim.uv.fs_chmod(unreadable_path, 384)) -- restore 0600 in the owned fixture

local different = options('prepare-different-link-conflict')
vim.fn.mkdir(different.agent_dir, 'p')
local other_source = root .. '/other-models.json'
vim.fn.writefile({ 'other bytes' }, other_source)
path = different.agent_dir .. '/models.json'
assert(vim.uv.fs_symlink(other_source, path))
rejected(different, 'models.json')
assert(vim.uv.fs_readlink(path) == other_source)
assert(table.concat(vim.fn.readfile(vim.uv.fs_realpath(path)), '\n') == 'other bytes')

-- prepare_creation_race: accept a matching concurrent winner, reject a conflicting winner.
local raced = options('prepare-race-match')
local original_symlink = vim.uv.fs_symlink
vim.uv.fs_symlink = function(target, destination, flags)
  local created = original_symlink(target, destination, flags)
  assert(created)
  return nil, 'EEXIST', 17
end
local ok, err = profiles.prepare(raced)
vim.uv.fs_symlink = original_symlink
assert(ok, tostring(err))
assert(vim.uv.fs_realpath(raced.agent_dir .. '/models.json') == vim.uv.fs_realpath(source))

local raced_conflict = options('prepare-race-conflict')
vim.uv.fs_symlink = function(_, destination, flags)
  local created = original_symlink(other_source, destination, flags)
  assert(created)
  return nil, 'EEXIST', 17
end
ok, err = profiles.prepare(raced_conflict)
vim.uv.fs_symlink = original_symlink
assert(not ok and tostring(err):find('models.json', 1, true), tostring(err))
assert(vim.uv.fs_readlink(raced_conflict.agent_dir .. '/models.json') == other_source)

-- switch_waits_for_process_exit_and_restores_profile_scoped_help_roles
config.setup(fixture.options())
vim.fn.writefile({}, vim.env.AI_TEST_ARGV_LOG)
vim.fn.writefile({}, vim.env.AI_TEST_LOG)
require('ai').setup(config.options)
assert(vim.api.nvim_get_commands({})['AIProfile'] and vim.api.nvim_get_commands({})['AIProfileStatus'])
local chat = require('ai.chat')
local function launches()
  if vim.fn.filereadable(vim.env.AI_TEST_ARGV_LOG) == 0 then return {} end
  local out = {}
  for _, line in ipairs(vim.fn.readfile(vim.env.AI_TEST_ARGV_LOG)) do
    local item = vim.json.decode(line)
    if item.mode then out[#out + 1] = item end
  end
  return out
end
local function messages()
  if vim.fn.filereadable(vim.env.AI_TEST_LOG) == 0 then return {} end
  local out = {}
  for _, line in ipairs(vim.fn.readfile(vim.env.AI_TEST_LOG)) do
    local item = vim.json.decode(line)
    if item.mode == 'chat' then out[#out + 1] = item end
  end
  return out
end
local function input_buffer(conversation, text)
  for _, map in ipairs(vim.api.nvim_buf_get_keymap(conversation, 'n')) do
    if map.lhs == 'i' then map.callback(); break end
  end
  local input = vim.api.nvim_get_current_buf()
  assert(input ~= conversation, 'chat prompt input did not open')
  if text then vim.api.nvim_buf_set_lines(input, 0, -1, false, { text }) end
  return input
end
local function submit_input(input)
  for _, map in ipairs(vim.api.nvim_buf_get_keymap(input, 'i')) do
    if map.lhs == '<CR>' then map.callback(); return end
  end
  error('missing chat Enter mapping')
end
local function wait_for(fn)
  assert(vim.wait(7000, fn, 10), 'profile-switch test timed out')
end
chat.toggle()
wait_for(function() return #launches() == 1 end)
wait_for(function() return chat.busy_reason() == nil end)
local workbench_token = profiles.token()
local workbench_buffer = vim.api.nvim_get_current_buf()
assert(vim.api.nvim_buf_get_name(workbench_buffer):find('workbench:chat', 1, true))
assert(profiles.set_help_roles('expensive', 'chat'))
local before = 0
assert(profiles.switch('studio', function(ok) before = before + (ok and 1 or -1) end))
assert(profiles.status().phase == 'switching' and profiles.status().active == 'workbench')
assert(not profiles.allows(workbench_token), 'retired generation must be invalid immediately')
wait_for(function() return before ~= 0 end)
assert(before == 1 and profiles.status().active == 'studio' and profiles.status().phase == 'idle')
wait_for(function() return require('ai.rpc').is_idle() end)
assert(profiles.help_roles().role == 'cheap' and profiles.help_roles().bang_role == 'expensive')
chat.toggle()
wait_for(function() return #launches() == 2 end)
wait_for(function() return chat.busy_reason() == nil end)
local studio_buffer = vim.api.nvim_get_current_buf()
assert(vim.api.nvim_buf_get_name(studio_buffer):find('studio:chat', 1, true))
local returned = 0
assert(profiles.switch('workbench', function(ok) returned = returned + (ok and 1 or -1) end))
wait_for(function() return returned ~= 0 end)
assert(returned == 1 and profiles.status().active == 'workbench')
assert(profiles.help_roles().role == 'expensive' and profiles.help_roles().bang_role == 'chat')
chat.toggle()
assert(vim.api.nvim_get_current_buf() == workbench_buffer, 'profile draft/view must be restored')
assert(not vim.api.nvim_buf_is_valid(studio_buffer) or vim.api.nvim_buf_get_name(studio_buffer):find('studio:chat', 1, true))
wait_for(function() return #launches() == 3 and chat.busy_reason() == nil end)
local workbench_agent_dir, studio_agent_dir = launches()[1].agent_dir, launches()[2].agent_dir
assert(workbench_agent_dir ~= studio_agent_dir, 'profiles must use independent agent directories')
local input = input_buffer(workbench_buffer, 'workbench history marker')
submit_input(input)
wait_for(function() return #messages() == 1 and chat.busy_reason() == nil end)
local workbench_draft = input_buffer(workbench_buffer, 'workbench draft only')
chat.toggle() -- hide the cached workbench view while switching
local studio_ready
assert(profiles.switch('studio', function(ok) studio_ready = ok end))
wait_for(function() return studio_ready ~= nil end)
assert(studio_ready)
chat.toggle()
wait_for(function() return #launches() == 4 and chat.busy_reason() == nil end)
input = input_buffer(studio_buffer, 'studio history marker')
submit_input(input)
wait_for(function() return #messages() == 2 and chat.busy_reason() == nil end)
local workbench_session_id, studio_session_id = messages()[1].session_id, messages()[2].session_id
assert(workbench_session_id ~= studio_session_id, 'profiles must use independent persisted chat sessions')
local workbench_ready
assert(profiles.switch('workbench', function(ok) workbench_ready = ok end))
wait_for(function() return workbench_ready ~= nil end)
assert(workbench_ready)
chat.toggle()
wait_for(function() return #launches() == 5 and chat.busy_reason() == nil end)
assert(vim.api.nvim_buf_is_valid(workbench_draft)
  and vim.api.nvim_buf_get_lines(workbench_draft, 0, -1, false)[1] == 'workbench draft only',
  'workbench draft contents must survive profile retirement')
local workbench_lines = table.concat(vim.api.nvim_buf_get_lines(workbench_buffer, 0, -1, false), '\n')
assert(workbench_lines:find('workbench history marker', 1, true), 'workbench history must be restored independently')
assert(not workbench_lines:find('studio history marker', 1, true), 'studio history must not leak into workbench')
input = input_buffer(workbench_buffer, 'workbench follow-up')
submit_input(input)
wait_for(function() return #messages() == 3 and chat.busy_reason() == nil end)
assert(messages()[3].session_id == workbench_session_id and messages()[3].previous_messages == 2,
  'workbench reconnect must restore its own persisted two-message history')
local studio_again
assert(profiles.switch('studio', function(ok) studio_again = ok end))
wait_for(function() return studio_again ~= nil end)
assert(studio_again)
chat.toggle()
wait_for(function() return #launches() == 6 and chat.busy_reason() == nil end)
local studio_lines = table.concat(vim.api.nvim_buf_get_lines(studio_buffer, 0, -1, false), '\n')
assert(studio_lines:find('studio history marker', 1, true), 'studio history must be restored independently')
assert(not studio_lines:find('workbench history marker', 1, true), 'workbench history must not leak into studio')
input = input_buffer(studio_buffer, 'studio follow-up')
submit_input(input)
wait_for(function() return #messages() == 4 and chat.busy_reason() == nil end)
assert(messages()[4].session_id == studio_session_id and messages()[4].previous_messages == 2,
  'studio reconnect must restore its own persisted two-message history')
chat.stop()
wait_for(function() return require('ai.rpc').is_idle() end)
local status_profile
assert(profiles.switch('workbench', function(ok) status_profile = ok end))
wait_for(function() return status_profile ~= nil end)
assert(status_profile)

local notices, picker = {}, nil
local original_notify, original_select = vim.notify, vim.ui.select
vim.notify = function(text) notices[#notices + 1] = tostring(text) end
vim.ui.select = function(items, opts, callback) picker = { items = items, opts = opts, callback = callback } end
vim.cmd.AIProfileStatus()
assert(notices[#notices]:find('cheap=lego%-openai/gpt%-6%-luna%-2026%-09%-22/high'))
assert(notices[#notices]:find('expensive=lego%-anthropic/eu%.anthropic%.claude%-opus%-5%-5/medium'))
assert(notices[#notices]:find('AIHelp=expensive AIHelp!=chat', 1, true))
assert(notices[#notices]:find('apiKey', 1, true) == nil)
vim.cmd.AIProfile()
assert(picker and picker.opts.prompt == 'AI profile', 'AIProfile without a name must open a picker')
assert(vim.tbl_contains(picker.items, 'studio') and vim.tbl_contains(picker.items, 'workbench'))
assert(picker.opts.format_item('studio'):find('fixture%-openai/arbitrary%-chat%-model/off'), picker.opts.format_item('studio'))
picker.callback('studio')
wait_for(function() return profiles.status().active == 'studio' and profiles.status().phase == 'idle' end)
vim.cmd.AIProfile()
local stale_picker = picker
local returned = false
assert(profiles.switch('workbench', function(ok) returned = ok end))
wait_for(function() return returned end)
stale_picker.callback('studio')
assert(profiles.status().active == 'workbench', 'stale picker callback must not switch the active profile')
assert(notices[#notices]:find('picker is stale', 1, true))
vim.ui.select, vim.notify = original_select, original_notify

-- timeout_and_current_name_recovery: a retired child may exit late, but cannot publish its target.
local hold_exit = vim.env.AI_TEST_HOLD_EXIT_FILE
assert(vim.fn.writefile({}, hold_exit .. '.armed') == 0)
config.options.limits.startup_ms, config.options.limits.shutdown_ms = 200, 5000
chat.toggle()
wait_for(function() return chat.busy_reason() == nil end)
local retired_token = profiles.token()
local timed_out = false
assert(profiles.switch('studio', function(ok, err)
  timed_out = true
  assert(not ok and err:find('timed out', 1, true), tostring(err))
end))
wait_for(function() return timed_out end)
assert(profiles.status().phase == 'error' and profiles.status().active == 'workbench')
assert(not profiles.allows(retired_token), 'timeout must keep ingress locked')
local blocked, blocked_error
assert(not profiles.switch('studio', function(ok, err) blocked, blocked_error = ok, err end))
assert(blocked == false and blocked_error:find('still exiting', 1, true))
assert(profiles.status().active == 'workbench', 'late exit cannot publish an abandoned target')
assert(vim.fn.writefile({}, hold_exit) == 0)
wait_for(function() return require('ai.rpc').is_idle() end)
local recovered
assert(profiles.switch('workbench', function(ok) recovered = ok end))
assert(recovered == true and profiles.status().phase == 'idle' and profiles.status().active == 'workbench')
assert(vim.fn.delete(hold_exit .. '.armed') == 0)

-- Later test groups share this owned fake-Pi log; keep profile-specific launches scoped here.
vim.fn.writefile({}, vim.env.AI_TEST_ARGV_LOG)

print('AI profile preparation and switching tests passed')
