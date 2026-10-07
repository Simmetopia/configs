-- Session identity, CLI tool policies, and startup handshake shared by both workflows.
local rpc = require('ai.rpc')
local M = {}

function M.id(root, mode, tier)
  -- Preserve the old IDs so this refactor resumes existing histories.
  if mode == 'chat' then return 'chat-' .. vim.fn.sha256(root .. ':web-chat'):sub(1, 32) end
  local hash = vim.fn.sha256(root .. ':' .. mode .. ':' .. tier)
  return hash:sub(1, 8) .. '-' .. hash:sub(9, 12) .. '-4' .. hash:sub(14, 16)
    .. '-8' .. hash:sub(18, 20) .. '-' .. hash:sub(21, 32)
end

function M.args(root, mode, tier)
  local options = require('ai.config').options
  local model = options.models[tier]
  local args = { '--mode', 'rpc', '--session-id', M.id(root, mode, tier),
    '--provider', model.provider, '--model', model.id }
  if model.thinking then vim.list_extend(args, { '--thinking', model.thinking }) end
  if mode == 'question' then
    vim.list_extend(args, { '--tools', 'read,grep,find,ls', '--no-extensions' })
  elseif mode == 'chat' then
    vim.list_extend(args, {
      '--no-extensions', '--extension', options.chat.search_extension, '--extension', options.chat.extension,
      '--tools', 'web_search,webfetch', '--no-context-files', '--no-skills', '--no-prompt-templates',
      '--system-prompt', require('ai.prompts').chat,
    })
  end
  -- Edit mode intentionally inherits Pi's usual tools, resources and trust policy.
  return args
end

function M.start(root, mode, tier, hooks)
  local options = require('ai.config').options
  local session = { root = root, mode = mode, tier = tier, stream = '', blocks = {}, ready = false }
  if mode == 'chat' and vim.fn.filereadable(options.chat.extension) == 0 then
    return nil, 'Pi companion extension not found: ' .. options.chat.extension
  end
  local client, err = rpc.spawn(root, M.args(root, mode, tier), {
    on_event = function(event) hooks.on_event(session, event) end,
    on_error = function(message) hooks.on_error(session, message); rpc.stop(session.client) end,
    on_diagnostic = function(message) hooks.on_diagnostic(message) end,
    on_exit = function(code, stopping)
      session.ready = false
      hooks.on_exit(session, code, stopping)
    end,
  })
  if not client then return nil, 'Cannot start Pi RPC: ' .. tostring(err) end
  session.client = client
  rpc.deadline(client, options.limits.startup_ms, function()
    hooks.on_error(session, 'Pi startup timed out; restart after exit')
    rpc.stop(client)
  end)
  local function fail(message)
    if client.stopping then return end
    hooks.on_error(session, message)
    rpc.stop(client)
  end
  local function ready()
    if client.stopping then return end
    -- Restore history before permitting a new prompt: avoid racing history and live events.
    M.send(session, { type = 'get_messages' }, function(history)
      if client.stopping then return end
      rpc.clear_deadline(client)
      session.ready = true
      hooks.on_ready(session, history.success and history.data and history.data.messages or {})
    end)
  end
  M.send(session, { type = 'get_state' }, function(response)
    if client.stopping then return end
    if not response.success then return fail('Pi initialization failed') end
    local state = response.data or {}
    local actual, expected = state.model or {}, options.models[tier]
    if actual.provider ~= expected.provider or actual.id ~= expected.id then
      return fail('Refusing mismatched persisted model; expected ' .. expected.provider .. '/' .. expected.id)
    end
    if expected.thinking and state.thinkingLevel ~= expected.thinking then
      M.send(session, { type = 'set_thinking_level', level = expected.thinking }, function(result)
        if not result.success then return fail('Could not set thinking level to ' .. expected.thinking) end
        ready()
      end)
    else
      ready()
    end
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
