-- Normalized plugin options and per-profile model descriptors.
local M = {}
local source = debug.getinfo(1, 'S').source:sub(2)
local package_root = vim.fs.dirname(source)

local thinking_levels = { off = true, minimal = true, low = true, medium = true, high = true, xhigh = true, max = true }

M.defaults = {
  executable = 'pi',
  mappings = { project = '<leader>aip', chat = '<leader>aic', help = '<leader>aih' },
  help = { role = 'cheap', bang_role = 'expensive', context_lines = 30, selection_bytes = 200 * 1024 },
  comments = { enabled = true, prompt_role = 'cheap' },
  chat = {
    role = 'chat',
    extension = vim.fs.joinpath(package_root, 'pi-extension', 'index.ts'),
  },
  limits = {
    startup_ms = 10000,
    shutdown_ms = 3000,
    record_bytes = 1024 * 1024,
    file_bytes = 2 * 1024 * 1024,
    history_lines = 350,
    response_bytes = 20000,
    restored_bytes = 20000,
    handled_markers = 1000,
  },
  ui = { width = 0.8, height = 0.75, border = 'single', conceallevel = 0,
    icons = { user = '', assistant = '󰚩', warn = '', error = '', running = '⋯', ok = '✓', failed = '✗',
      fold_closed = '▸', fold_open = '▾', band = '▓▓' } },
}
M.options = vim.deepcopy(M.defaults)

local function nonempty_string(value)
  return type(value) == 'string' and value:match('%S') ~= nil
end

local function descriptor(value, profile_name, role)
  assert(type(value) == 'table', ('AI: profile %s model %s must be a descriptor'):format(profile_name, role))
  assert(nonempty_string(value.provider), ('AI: profile %s model %s requires provider'):format(profile_name, role))
  assert(nonempty_string(value.id), ('AI: profile %s model %s requires id'):format(profile_name, role))
  local thinking = value.thinking
  if thinking == nil then thinking = 'off' end
  assert(type(thinking) == 'string' and thinking_levels[thinking],
    ('AI: profile %s model %s has invalid thinking level'):format(profile_name, role))
  return { provider = value.provider, id = value.id, thinking = thinking }
end

function M.setup(options)
  assert(type(options) == 'table', 'AI: setup options must be a table')
  local result = vim.tbl_deep_extend('force', vim.deepcopy(M.defaults), options)
  assert(nonempty_string(result.active_profile), 'AI: active_profile must be a nonempty name')
  assert(type(result.profiles) == 'table' and next(result.profiles) ~= nil, 'AI: profiles must be a nonempty map')
  assert(result.profiles[result.active_profile] ~= nil, 'AI: active_profile must name a configured profile')

  local profiles = {}
  for name, value in pairs(result.profiles) do
    assert(nonempty_string(name), 'AI: profile names must be nonempty strings')
    assert(type(value) == 'table', 'AI: profile ' .. name .. ' must be a table')
    assert(nonempty_string(value.agent_dir), 'AI: profile ' .. name .. ' requires agent_dir')
    if value.models_file ~= nil then
      assert(nonempty_string(value.models_file), 'AI: profile ' .. name .. ' models_file must be a nonempty path')
    end
    assert(type(value.models) == 'table', 'AI: profile ' .. name .. ' requires models')
    local chat = descriptor(value.models.chat, name, 'chat')
    local models = { chat = chat }
    for _, role in ipairs({ 'cheap', 'expensive' }) do
      models[role] = value.models[role] == nil and vim.deepcopy(chat) or descriptor(value.models[role], name, role)
    end
    profiles[name] = {
      name = name,
      agent_dir = value.agent_dir,
      models_file = value.models_file,
      models = models,
    }
  end
  result.profiles = profiles
  result.comments.prompt_role = result.comments.prompt_role or 'cheap'
  result.chat.role = result.chat.role or 'chat'
  assert(result.comments.prompt_role == 'cheap' or result.comments.prompt_role == 'expensive' or result.comments.prompt_role == 'chat',
    'AI: comments.prompt_role must be chat, cheap, or expensive')
  assert(result.chat.role == 'chat' or result.chat.role == 'cheap' or result.chat.role == 'expensive',
    'AI: chat.role must be chat, cheap, or expensive')
  assert(result.help.role == 'cheap' or result.help.role == 'expensive' or result.help.role == 'chat',
    'AI: help.role must be chat, cheap, or expensive')
  assert(result.help.bang_role == 'cheap' or result.help.bang_role == 'expensive' or result.help.bang_role == 'chat',
    'AI: help.bang_role must be chat, cheap, or expensive')

  M.options = result
  return result
end

function M.profile(name)
  local profile = M.options.profiles and M.options.profiles[name]
  assert(profile, 'AI: unknown profile ' .. tostring(name))
  return profile
end

function M.model(profile, role)
  assert(type(profile) == 'table' and type(profile.models) == 'table', 'AI: invalid profile')
  local model = profile.models[role]
  assert(model, 'AI: unknown model role ' .. tostring(role))
  return model
end

return M
