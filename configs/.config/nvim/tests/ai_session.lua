-- Run: PATH="$PWD/tests/bin:$PATH" nvim --headless -u NONE -l tests/ai_session.lua
vim.opt.rtp:append(vim.fn.getcwd())
local config = require('ai.config')
config.setup(dofile('tests/fixtures/ai_setup.lua').options({ limits = { startup_ms = 10000, shutdown_ms = 100 } }))
local session = require('ai.session')
local protocol = require('ai.protocol')
local root = vim.fn.getcwd()
local initial_argv_record_count = vim.fn.filereadable(vim.env.AI_TEST_ARGV_LOG) == 1
  and #vim.fn.readfile(vim.env.AI_TEST_ARGV_LOG) or 0
local function wait_for(fn) assert(vim.wait(15000, fn, 10), 'session test timed out') end

local profile = config.profile('workbench')
local identity = assert(session.identity(root, 'edit', 'cheap', profile))
assert(identity.version == 'profiles-v1' and identity.profile == 'workbench')
assert(identity.agent_dir == require('ai.profiles').canonical(profile.agent_dir) and identity.root == vim.uv.fs_realpath(root))
assert(identity.mode == 'edit' and identity.role == 'cheap' and identity.provider == 'lego-openai')
assert(identity.id == 'gpt-6-luna-2026-09-22' and identity.thinking == 'high')

local function contains(args, value) return vim.tbl_contains(args, value) end
local function argument(args, name)
  for i, value in ipairs(args) do if value == name then return args[i + 1] end end
end
local launch_modes = {
  edit = { role = 'cheap', tools = 'read,bash,edit,write', extensions = 0 },
  question = { role = 'cheap', tools = 'read,grep,find,ls', extensions = 0 },
  selection = { role = 'cheap', tools = 'read,grep,find,ls,replace_selection', extensions = 1 },
  chat = { role = 'chat', tools = 'web_search,webfetch', extensions = 2 },
}
for mode, expected in pairs(launch_modes) do
  local args = assert(session.args(root, mode, expected.role, profile))
  for _, flag in ipairs({ '--mode', '--no-approve', '--no-extensions', '--no-mcp', '--no-skills',
    '--no-prompt-templates', '--no-themes', '--no-context-files' }) do
    assert(contains(args, flag), mode .. ' missing ' .. flag)
  end
  assert(argument(args, '--mode') == 'rpc')
  assert(argument(args, '--provider') == (expected.role == 'chat' and 'lego-openai' or 'lego-openai'))
  assert(argument(args, '--model') == (expected.role == 'chat' and 'gpt-6.1-sol-2026-09-29' or 'gpt-6-luna-2026-09-22'))
  assert(argument(args, '--thinking') == 'high')
  assert(argument(args, '--tools') == expected.tools)
  assert(argument(args, '--session-dir') == require('ai.profiles').canonical(profile.agent_dir) .. '/sessions')
  assert(argument(args, '--system-prompt') == require('ai.prompts').system(mode))
  local append_index = vim.fn.index(args, '--append-system-prompt')
  assert(append_index >= 0 and args[append_index + 2] == '', mode .. ' append prompt must be explicit empty argv')
  local extensions = {}
  for i, item in ipairs(args) do if item == '--extension' then extensions[#extensions + 1] = args[i + 1] end end
  assert(#extensions == expected.extensions, mode .. ' extension count')
  if mode == 'selection' then assert(contains(args, '--no-session') and not contains(args, '--session-id'))
  else assert(contains(args, '--session-id') and not contains(args, '--no-session')) end
end
local expensive_args = assert(session.args(root, 'edit', 'expensive', profile))
assert(argument(expensive_args, '--provider') == 'lego-anthropic')
assert(argument(expensive_args, '--model') == 'eu.anthropic.claude-opus-5-5')
assert(argument(expensive_args, '--thinking') == 'medium')
assert(session.id(assert(session.identity(root .. '/.', 'edit', 'cheap', profile))) == session.id(identity),
  'canonical root aliases must share one profile-aware pointer')
local function distinct(changed_profile, changed_root, changed_mode, changed_role)
  local changed = assert(session.identity(changed_root or root, changed_mode or 'edit', changed_role or 'cheap', changed_profile or profile))
  assert(session.id(changed) ~= session.id(identity), 'identity field did not partition history')
end
local changed = vim.deepcopy(profile); changed.name = 'renamed'
distinct(changed)
changed = vim.deepcopy(profile); changed.agent_dir = vim.env.AI_TEST_PROFILE_DIR .. '/agents/alternate'
distinct(changed)
distinct(nil, vim.fn.fnamemodify(root .. '/..', ':p'))
distinct(nil, nil, 'question')
distinct(nil, nil, nil, 'expensive')
changed = vim.deepcopy(profile); changed.models.cheap.provider = 'fixture-openai'
distinct(changed)
changed = vim.deepcopy(profile); changed.models.cheap.id = 'different-id'
distinct(changed)
changed = vim.deepcopy(profile); changed.models.cheap.thinking = 'low'
distinct(changed)
assert(protocol.text({ content = 'string message' }) == 'string message')
local ids = require('ai.session_ids')
local legacy_key = vim.fn.sha256(root .. ':edit:luna')
local legacy_path = vim.fn.stdpath('state') .. '/ai-sessions/' .. legacy_key .. '.id'
vim.fn.mkdir(vim.fs.dirname(legacy_path), 'p')
vim.fn.writefile({ '11111111-1111-4111-8111-111111111111' }, legacy_path)
local edit_id = assert(session.id(identity))
assert(edit_id ~= '11111111-1111-4111-8111-111111111111', 'legacy pointer was imported')
assert(ids.load(identity) == edit_id)
local chat_identity = assert(session.identity(root, 'chat', 'chat', profile))
local chat_id = assert(session.id(chat_identity))
local fresh_id = assert(ids.fresh(identity))
assert(fresh_id ~= edit_id and ids.load(identity) == fresh_id, 'reset did not replace only this identity')
assert(ids.load(chat_identity) == chat_id, 'reset changed an independent identity')
local studio_identity = assert(session.identity(root, 'edit', 'cheap', config.profile('studio')))
assert(session.id(studio_identity) ~= fresh_id, 'profile did not partition session history')
assert(session.id(assert(session.identity(root, 'question', 'cheap', profile))) ~= fresh_id, 'mode did not partition history')
assert(session.id(assert(session.identity(root, 'edit', 'expensive', profile))) ~= fresh_id, 'role/model did not partition history')
assert(protocol.text({ content = { { type = 'thinking', thinking = 'hidden' }, { type = 'text', text = 'answer' } } }) == 'answer')
local function capability_prompt_count()
  if vim.fn.filereadable(vim.env.AI_TEST_ARGV_LOG) == 0 then return 0 end
  local count = 0
  for _, line in ipairs(vim.fn.readfile(vim.env.AI_TEST_ARGV_LOG)) do
    local ok, item = pcall(vim.json.decode, line)
    if ok and item.capability_prompt then count = count + 1 end
  end
  return count
end
local stream = {}
protocol.update(stream, { type = 'text_delta', contentIndex = 2, delta = 'second' })
protocol.update(stream, { type = 'text_delta', contentIndex = 0, delta = 'first ' })
protocol.update(stream, { type = 'text_end', contentIndex = 2, content = 'last' })
assert(stream.stream == 'first last')
local count, errors = 0, 0
protocol.feed({ pending = '' }, string.rep('x', config.options.limits.record_bytes + 1) .. '\n',
  function() count = count + 1 end, function() errors = errors + 1 end)
assert(count == 0 and errors == 1)

for _, behavior in ipairs({ 'mismatch', 'timeout', 'unsupported', 'clamp', 'missing-command', 'wrong-capability', 'history' }) do
  local prompts_before = capability_prompt_count()
  vim.env.AI_TEST_BEHAVIOR = behavior
  config.options.limits.startup_ms = behavior == 'timeout' and 100 or 10000
  local ready, exited, failure, history = false, false, nil, nil
  local s = assert(session.start(root, 'chat', 'chat', {
    on_event = function() end, on_diagnostic = function() end,
    on_error = function(_, message) failure = message end,
    on_exit = function() exited = true end,
    on_ready = function(_, messages) ready, history = true, messages end,
  }))
  if behavior == 'history' then
    wait_for(function() return ready end)
    assert(protocol.text(history[1]) == 'Restored string history')
    assert(s.ready and s.model.thinking == 'high')
    assert(not failure)
    session.stop(s)
  else
    wait_for(function() return failure ~= nil end)
    assert(not ready)
    local expected = {
      mismatch = 'mismatched', timeout = 'timed out', unsupported = 'unsupported',
      clamp = 'thinking level', ['missing-command'] = 'capability command', ['wrong-capability'] = 'mismatched tool',
    }
    assert(failure:find(expected[behavior], 1, true), failure)
    if behavior == 'missing-command' then
      assert(capability_prompt_count() == prompts_before, 'missing capability command was sent as a prompt')
    end
  end
  wait_for(function() return exited end)
end
vim.env.AI_TEST_BEHAVIOR = nil
local argv_records = function()
  if vim.fn.filereadable(vim.env.AI_TEST_ARGV_LOG) == 0 then return {} end
  return vim.tbl_map(vim.json.decode, vim.fn.readfile(vim.env.AI_TEST_ARGV_LOG))
end
-- Other groups share this log; only launches made by this group use its profile.
local launches = vim.list_slice(argv_records(), initial_argv_record_count + 1)
assert(#launches >= 7)
for _, launch in ipairs(launches) do
  if launch.mode then
    assert(launch.agent_dir == profile.agent_dir)
    assert(launch.path_preserved and launch.fake_credential_preserved, 'child environment was not preserved')
  end
end
assert(vim.env.PI_CODING_AGENT_DIR == vim.env.AI_TEST_PROFILE_DIR .. '/terminal-agent', 'parent environment was mutated')
local rpc = require('ai.rpc')
local original_spawn = rpc.spawn
rpc.spawn = function(cwd, args, hooks, overrides)
  assert(cwd == identity.root)
  assert(vim.tbl_count(overrides) == 1 and overrides.PI_CODING_AGENT_DIR == profile.agent_dir,
    'only the authorized agent-dir override may be supplied')
  return original_spawn(cwd, args, hooks, overrides)
end
local hooks = {
  on_event = function() end, on_diagnostic = function() end, on_error = function() end,
  on_exit = function() end, on_ready = function() end,
}
local search_entry = config.options.chat.search_extension
local companion_entry = config.options.chat.extension
local function no_launch(mutator, mode)
  local before = #argv_records()
  mutator()
  local result, err = session.start(root, mode or 'chat', mode == 'selection' and 'cheap' or 'chat', hooks)
  assert(not result and err, 'invalid local extension should fail before spawning')
  assert(#argv_records() == before, 'invalid extension spawned Pi')
end
no_launch(function() config.options.chat.search_extension = vim.env.AI_TEST_PROFILE_DIR .. '/missing-entry.ts' end)
local alternate_entry = vim.fs.dirname(search_entry) .. '/alternate.ts'
vim.fn.writefile({ 'export default function () {}' }, alternate_entry)
no_launch(function() config.options.chat.search_extension = alternate_entry end)
config.options.chat.search_extension = search_entry
for _, unsupported_source in ipairs({ 'npm:pi-web-search@1.6.0', 'git+https://example.invalid/pi-web-search.git', 'https://example.invalid/index.ts' }) do
  no_launch(function() config.options.chat.search_extension = unsupported_source end)
  config.options.chat.search_extension = search_entry
end
local manifest = vim.fs.dirname(vim.fs.dirname(search_entry)) .. '/package.json'
local saved_manifest = vim.fn.readfile(manifest)
for _, invalid_manifest in ipairs({
  '{"name":"pi-web-search","version":"9.9.9","pi":{"extensions":["./src/index.ts"]}}',
  '{"name":"other-package","version":"1.6.0","pi":{"extensions":["./src/index.ts"]}}',
  '{"name":"pi-web-search","version":"1.6.0","pi":{"extensions":["./other.ts"]}}',
  '{"name":"pi-web-search","version":"1.6.0","pi":{"extensions":["./src/index.ts","./other.ts"]}}',
}) do
  no_launch(function() vim.fn.writefile({ invalid_manifest }, manifest) end)
  vim.fn.writefile(saved_manifest, manifest)
end
no_launch(function() config.options.chat.extension = vim.env.AI_TEST_PROFILE_DIR .. '/missing-companion.ts' end, 'selection')
config.options.chat.search_extension, config.options.chat.extension = search_entry, companion_entry
rpc.spawn = original_spawn
-- Setup is idempotent, and both workflows register under one entry point.
require('ai').setup(dofile('tests/fixtures/ai_setup.lua').options({ comments = { enabled = false } }))
require('ai').setup(dofile('tests/fixtures/ai_setup.lua').options())
assert(vim.fn.exists(':AIToggle') == 2 and vim.fn.exists(':AIChat') == 2)
print('AI session tests passed')
