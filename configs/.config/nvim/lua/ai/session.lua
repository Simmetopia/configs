-- Session identity, explicit Pi CLI policy, capability checks, and startup handshake.
local rpc = require('ai.rpc')
local config = require('ai.config')
local profiles = require('ai.profiles')
local prompts = require('ai.prompts')
local M = {}

local mode_tools = {
  edit = 'read,bash,edit,write',
  question = 'read,grep,find,ls',
  selection = 'read,grep,find,ls,replace_selection',
  chat = 'web_search,webfetch',
}

local function canonical(path)
  return profiles.canonical(path)
end

function M.identity(root, mode, role, profile)
  profile = profile or profiles.current()
  local tool_list = mode_tools[mode]
  if not tool_list then return nil, 'AI: unknown mode ' .. tostring(mode) end
  local canonical_root, root_err = canonical(root)
  if not canonical_root then return nil, 'AI: project root: ' .. root_err end
  local agent_dir, agent_err = canonical(profile.agent_dir)
  if not agent_dir then return nil, 'AI: profile agent_dir: ' .. agent_err end
  local model = config.model(profile, role)
  return {
    version = 'profiles-v1',
    profile = profile.name,
    agent_dir = agent_dir,
    root = canonical_root,
    mode = mode,
    role = role,
    provider = model.provider,
    id = model.id,
    thinking = model.thinking,
  }
end

function M.id(identity)
  return require('ai.session_ids').load(identity) or require('ai.session_ids').fresh(identity)
end

local function add(args, ...)
  vim.list_extend(args, { ... })
end

function M.args(root, mode, role, profile)
  local identity, identity_err = M.identity(root, mode, role, profile)
  if not identity then return nil, identity_err end
  local options = config.options
  local agent_dir = identity.agent_dir
  local args = {
    '--mode', 'rpc',
    '--no-approve', '--no-extensions', '--no-mcp', '--no-skills', '--no-prompt-templates', '--no-themes', '--no-context-files',
    '--system-prompt', prompts.system(mode), '--append-system-prompt', '',
    '--provider', identity.provider, '--model', identity.id, '--thinking', identity.thinking,
    '--session-dir', vim.fs.joinpath(agent_dir, 'sessions'),
  }
  if mode == 'selection' then
    add(args, '--no-session')
  else
    local session_id, id_err = M.id(identity)
    if not session_id then return nil, id_err end
    add(args, '--session-id', session_id)
  end
  add(args, '--tools', mode_tools[mode])
  if mode == 'chat' then
    add(args, '--extension', options.chat.search_extension, '--extension', options.chat.extension)
  elseif mode == 'selection' then
    add(args, '--extension', options.chat.extension)
  end
  return args
end

local function absolute_local_file(path)
  return type(path) == 'string' and path ~= '' and path:sub(1, 1) == '/' and vim.fn.filereadable(path) == 1
end

local function manifest_has_entry(manifest)
  local entries = manifest.pi and manifest.pi.extensions
  if type(entries) == 'string' then return entries == './src/index.ts' end
  if type(entries) ~= 'table' then return false end
  return #entries == 1 and entries[1] == './src/index.ts'
end

local function extension_error(mode)
  local companion = config.options.chat.extension
  if (mode == 'chat' or mode == 'selection') and not absolute_local_file(companion) then
    return 'Pi companion extension entry is missing or not a local file'
  end
  if mode ~= 'chat' then return nil end
  local entry = config.options.chat.search_extension
  if not absolute_local_file(entry) then return 'Pi web-search extension must be an existing absolute local entry point' end
  local package_root = vim.fs.dirname(vim.fs.dirname(entry))
  local manifest_path = vim.fs.joinpath(package_root, 'package.json')
  if vim.fn.filereadable(manifest_path) ~= 1 then return 'Pi web-search package manifest is missing' end
  local ok, manifest = pcall(vim.json.decode, table.concat(vim.fn.readfile(manifest_path), '\n'))
  if not ok or type(manifest) ~= 'table' then return 'Pi web-search package manifest is invalid' end
  if manifest.name ~= 'pi-web-search' or manifest.version ~= '1.6.0' or not manifest_has_entry(manifest) then
    return 'Pi web-search package name, version, or declared entry does not match pi-web-search@1.6.0'
  end
  local declared_entry = vim.fs.joinpath(package_root, 'src/index.ts')
  if canonical(entry) ~= canonical(declared_entry) then
    return 'Pi web-search entry must be the package-declared src/index.ts'
  end
  return nil
end

local function exact_tools(value, expected)
  if type(value) ~= 'table' then return false end
  local found = {}
  for _, name in ipairs(value) do
    if type(name) ~= 'string' or found[name] then return false end
    found[name] = true
  end
  local count = 0
  for _ in pairs(found) do count = count + 1 end
  local target_count = 0
  for name in expected:gmatch('[^,]+') do
    target_count = target_count + 1
    if not found[name] then return false end
  end
  return count == target_count
end

local function has_command(commands, name)
  if type(commands) ~= 'table' then return false end
  for _, command in ipairs(commands) do
    if type(command) == 'table' and command.source == 'extension'
      and (command.name == name or command.name == '/' .. name) then return true end
  end
  return false
end

local function capability_check(session, finish)
  if session.mode ~= 'chat' and session.mode ~= 'selection' then return finish(true) end
  M.send(session, { type = 'get_commands' }, function(commands_response)
    if not commands_response.success or not has_command(commands_response.data and commands_response.data.commands, 'nvim_ai_capabilities') then
      return finish(false, 'Required Pi companion capability command is unavailable')
    end
    local expected = mode_tools[session.mode]
    local wait = { handled = false, status = false, finished = false }
    session.capability_wait = wait
    local function complete()
      if wait.finished or not wait.handled or not wait.status then return end
      wait.finished = true
      session.capability_wait = nil
      finish(true)
    end
    wait.on_status = function(status)
      if type(status) ~= 'table' or not exact_tools(status.tools, expected) then
        if not wait.finished then
          wait.finished = true
          session.capability_wait = nil
          finish(false, 'Pi companion reported a mismatched tool capability set')
        end
        return
      end
      wait.status = true
      complete()
    end
    local sent = M.send(session, { type = 'prompt', message = '/nvim_ai_capabilities' }, function(response)
      if not response.success or not response.data or response.data.disposition ~= 'handled' then
        if not wait.finished then
          wait.finished = true
          session.capability_wait = nil
          finish(false, 'Pi companion capability command was not handled')
        end
        return
      end
      wait.handled = true
      complete()
    end)
    if not sent and not wait.finished then
      wait.finished = true
      session.capability_wait = nil
      finish(false, 'Could not request Pi companion capabilities')
    end
  end)
end

function M.check_state(session, done)
  local finished = false
  local function finish(ok, err)
    if finished then return end
    finished = true
    done(ok, err)
  end
  local expected = session.model
  local function verify_state()
    M.send(session, { type = 'get_state' }, function(response)
      if not response.success then return finish(false, 'Pi state verification failed') end
      local state = response.data or {}
      local actual = state.model or {}
      if actual.provider ~= expected.provider or actual.id ~= expected.id then
        return finish(false, 'Refusing mismatched persisted model; expected ' .. expected.provider .. '/' .. expected.id)
      end
      if state.thinkingLevel ~= expected.thinking then
        return finish(false, 'Pi did not retain the configured thinking level')
      end
      capability_check(session, finish)
    end)
  end
  M.send(session, { type = 'get_state' }, function(response)
    if not response.success then return finish(false, 'Pi initialization failed') end
    local state = response.data or {}
    local actual = state.model or {}
    if actual.provider ~= expected.provider or actual.id ~= expected.id then
      return finish(false, 'Refusing mismatched persisted model; expected ' .. expected.provider .. '/' .. expected.id)
    end
    M.send(session, { type = 'get_available_thinking_levels' }, function(levels_response)
      local levels = levels_response.success and levels_response.data and levels_response.data.levels or nil
      if type(levels) ~= 'table' then return finish(false, 'Could not verify supported thinking levels') end
      if not vim.tbl_contains(levels, expected.thinking) then
        return finish(false, 'Configured thinking level is unsupported by this model')
      end
      if state.thinkingLevel == expected.thinking then return verify_state() end
      M.send(session, { type = 'set_thinking_level', level = expected.thinking }, function(set_response)
        if not set_response.success then return finish(false, 'Could not set configured thinking level') end
        verify_state()
      end)
    end)
  end)
end

function M.start(root, mode, role, hooks)
  local local_error = extension_error(mode)
  if local_error then return nil, local_error end
  local profile = profiles.current()
  local prepared, prepare_err = profiles.prepare(profile)
  if not prepared then return nil, 'Cannot prepare Pi profile: ' .. tostring(prepare_err) end
  local identity, identity_err = M.identity(root, mode, role, profile)
  if not identity then return nil, identity_err end
  local args, args_err = M.args(root, mode, role, profile)
  if not args then return nil, args_err end
  local model = config.model(profile, role)
  local session = {
    root = identity.root, mode = mode, role = role, profile = profile,
    identity = identity, model = model, stream = '', blocks = {}, ready = false,
  }
  local client, err = rpc.spawn(identity.root, args, {
    on_event = function(event)
      local wait = session.capability_wait
      if wait and event.type == 'extension_ui_request' and event.method == 'setStatus'
        and event.statusKey == 'nvim-ai-capabilities' then
        local ok, status = pcall(vim.json.decode, event.statusText or '')
        wait.on_status(ok and status or nil)
      end
      hooks.on_event(session, event)
    end,
    on_error = function(message) hooks.on_error(session, message); rpc.stop(session.client) end,
    on_diagnostic = function(message) hooks.on_diagnostic(message) end,
    on_exit = function(code, stopping)
      session.ready = false
      hooks.on_exit(session, code, stopping)
    end,
  }, { PI_CODING_AGENT_DIR = profile.agent_dir })
  if not client then return nil, 'Cannot start Pi RPC: ' .. tostring(err) end
  session.client = client
  rpc.deadline(client, config.options.limits.startup_ms, function()
    hooks.on_error(session, 'Pi startup timed out; restart after exit')
    rpc.stop(client)
  end)
  local function fail(message)
    if client.stopping then return end
    hooks.on_error(session, message)
    rpc.stop(client)
  end
  M.check_state(session, function(ok, state_err)
    if client.stopping then return end
    if not ok then return fail(state_err or 'Pi startup validation failed') end
    M.send(session, { type = 'get_messages' }, function(history)
      if client.stopping then return end
      rpc.clear_deadline(client)
      session.ready = true
      hooks.on_ready(session, history.success and history.data and history.data.messages or {})
    end)
  end)
  return session
end

function M.send(session, command, callback)
  return rpc.send(session and session.client, command, callback)
end

function M.stop(session)
  if session then session.ready = false; rpc.stop(session.client) end
end

return M
