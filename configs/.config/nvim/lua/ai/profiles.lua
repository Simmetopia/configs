-- Profile path preparation, generation ownership, memory-only overrides, and idle switching.
local M = {}
local uv = vim.uv
local generation = 1
local phase, target_name, transition_error = 'idle', nil, nil
local transition
local help_overrides = {}

local function normalize(path)
  return vim.fs.normalize(vim.fn.fnamemodify(path, ':p'))
end

function M.canonical(path)
  if type(path) ~= 'string' or path == '' then return nil, 'path must be a nonempty string' end
  local absolute = normalize(path)
  local cursor, suffix = absolute, {}
  while not uv.fs_lstat(cursor) do
    local parent = vim.fs.dirname(cursor)
    if parent == cursor then return nil, 'no existing ancestor for path' end
    table.insert(suffix, 1, vim.fs.basename(cursor))
    cursor = parent
  end
  local resolved = uv.fs_realpath(cursor)
  if not resolved then return nil, 'cannot resolve existing path ancestor' end
  for _, part in ipairs(suffix) do resolved = vim.fs.joinpath(resolved, part) end
  return vim.fs.normalize(resolved)
end

local function same_path(left, right)
  local a, aerr = M.canonical(left)
  if not a then return nil, aerr end
  local b, berr = M.canonical(right)
  if not b then return nil, berr end
  return a == b
end

function M.current()
  local config = require('ai.config')
  return config.profile(config.options.active_profile)
end

function M.token()
  return { name = M.current().name, generation = generation }
end

function M.allows(token)
  return phase == 'idle' and type(token) == 'table'
    and token.name == M.current().name and token.generation == generation
end

function M.status()
  local status = { active = M.current().name, phase = phase }
  if target_name then status.target = target_name end
  if transition_error then status.error = transition_error end
  return status
end

function M.help_roles()
  local profile = M.current()
  if not help_overrides[profile.name] then
    local defaults = require('ai.config').options.help
    help_overrides[profile.name] = { role = defaults.role, bang_role = defaults.bang_role }
  end
  return vim.deepcopy(help_overrides[profile.name])
end

function M.set_help_roles(role, bang_role)
  local roles = M.help_roles()
  local function valid(value)
    return value == 'chat' or value == 'cheap' or value == 'expensive'
  end
  if role ~= nil then
    if not valid(role) then return nil, 'unknown AI help role ' .. tostring(role) end
    roles.role = role
  end
  if bang_role ~= nil then
    if not valid(bang_role) then return nil, 'unknown AI help role ' .. tostring(bang_role) end
    roles.bang_role = bang_role
  end
  help_overrides[M.current().name] = roles
  return vim.deepcopy(roles)
end

local function terminal_agent_dir()
  local path = vim.env.PI_CODING_AGENT_DIR
  if not path or path == '' then path = vim.fn.expand('~/.pi/agent') end
  return path
end

local function validate_unique(profile, agent_dir)
  local options = require('ai.config').options
  local terminal_same, terminal_err = same_path(agent_dir, terminal_agent_dir())
  if terminal_same == nil then return nil, terminal_err end
  if terminal_same then return nil, 'profile agent_dir aliases the terminal Pi agent directory' end
  for name, other in pairs(options.profiles or {}) do
    if name ~= profile.name then
      local same, err = same_path(agent_dir, other.agent_dir)
      if same == nil then return nil, err end
      if same then return nil, 'profile agent_dir duplicates profile ' .. name end
    end
  end
  return true
end

local function source_path(profile)
  if not profile.models_file then return nil end
  local source, err = M.canonical(profile.models_file)
  if not source then return nil, 'models_file: ' .. err end
  local stat = uv.fs_stat(source)
  if not stat or stat.type ~= 'file' or vim.fn.filereadable(source) ~= 1 then
    return nil, 'models_file must resolve to a readable regular file'
  end
  return source
end

local function ensure_model_link(agent_dir, source)
  local destination = vim.fs.joinpath(agent_dir, 'models.json')
  local stat = uv.fs_lstat(destination)
  if stat then
    if stat.type ~= 'link' then return nil, 'models.json already exists and is not a symlink' end
    local target = uv.fs_realpath(destination)
    if not target then return nil, 'models.json is a dangling symlink' end
    if target ~= source then return nil, 'models.json symlink points to a different file' end
    return true
  end
  local created, err = uv.fs_symlink(source, destination, {})
  if created then return true end
  -- A concurrent creator is acceptable only when its completed link has the exact source target.
  stat = uv.fs_lstat(destination)
  if stat and stat.type == 'link' then
    local target = uv.fs_realpath(destination)
    if target == source then return true end
  end
  return nil, 'could not create models.json symlink: ' .. tostring(err)
end

function M.prepare(profile)
  if type(profile) ~= 'table' then return nil, 'profile must be a table' end
  local agent_dir, err = M.canonical(profile.agent_dir)
  if not agent_dir then return nil, err end
  local unique, unique_err = validate_unique(profile, agent_dir)
  if not unique then return nil, unique_err end
  local source, source_err = source_path(profile)
  if profile.models_file and not source then return nil, source_err end

  local made = vim.fn.mkdir(agent_dir, 'p')
  if made == 0 and not uv.fs_stat(agent_dir) then return nil, 'could not create profile agent_dir' end
  local after, after_err = M.canonical(agent_dir)
  if not after then return nil, after_err end
  local still_unique, collision = validate_unique(profile, after)
  if not still_unique then return nil, collision end
  profile.agent_dir = after

  if source then
    local ok, link_err = ensure_model_link(after, source)
    if not ok then return nil, link_err end
  end
  return true
end

local function busy_reason()
  for _, module_name in ipairs({ 'ai.chat', 'ai.comments', 'ai.help' }) do
    local ok, module = pcall(require, module_name)
    if ok and module.busy_reason then
      local reason = module.busy_reason()
      if reason then return reason end
    end
  end
end

local function complete(done, ok, err)
  if type(done) == 'function' then done(ok, err) end
end

local function recover_if_possible()
  if phase ~= 'error' then return true end
  if not require('ai.rpc').is_idle() then return nil, 'Pi processes are still exiting; retry after they exit' end
  phase, target_name, transition_error, transition = 'idle', nil, nil, nil
  generation = generation + 1
  return true
end

function M.switch(name, done)
  local config = require('ai.config')
  if type(name) ~= 'string' or not config.options.profiles[name] then
    complete(done, false, 'unknown AI profile ' .. tostring(name))
    return false
  end
  if phase == 'switching' then
    complete(done, false, 'AI profile switch is already in progress')
    return false
  end
  if phase == 'error' then
    local recovered, recovery_err = recover_if_possible()
    if not recovered then complete(done, false, recovery_err); return false end
    if name == config.options.active_profile then
      complete(done, true)
      return true
    end
  end
  if name == config.options.active_profile and phase == 'idle' then
    complete(done, true)
    return true
  end
  local reason = busy_reason()
  if reason then
    complete(done, false, 'cannot switch AI profile while ' .. reason)
    return false
  end
  local target = config.profile(name)
  local prepared, prepare_err = M.prepare(target)
  if not prepared then
    complete(done, false, 'cannot prepare target AI profile: ' .. tostring(prepare_err))
    return false
  end

  generation = generation + 1
  phase, target_name, transition_error = 'switching', name, nil
  local operation = { done = done, completed = false, closed = false }
  transition = operation
  local function finish(ok, err)
    if operation.completed then return end
    operation.completed = true
    if type(operation.timer) == 'userdata' then
      operation.timer:stop()
      operation.timer:close()
      operation.timer = nil
    end
    if not ok then
      operation.closed = true
      phase, transition_error = 'error', err or 'AI profile switch failed'
      complete(operation.done, false, transition_error)
      return
    end
    if operation.closed or transition ~= operation then return end
    config.options.active_profile = name
    phase, target_name, transition_error, transition = 'idle', nil, nil, nil
    generation = generation + 1
    complete(operation.done, true)
  end
  for _, module_name in ipairs({ 'ai.chat', 'ai.comments', 'ai.help' }) do
    local ok, module = pcall(require, module_name)
    if ok and module.retire then
      local retired, retire_err = pcall(module.retire)
      if not retired then return finish(false, 'could not retire ' .. module_name .. ': ' .. tostring(retire_err)) end
    end
  end
  operation.timer = uv.new_timer()
  operation.timer:start(config.options.limits.startup_ms, 0, function()
    vim.schedule(function()
      if transition == operation and not operation.completed then
        finish(false, 'timed out waiting for Pi processes to exit; retry :AIProfile after they exit')
      end
    end)
  end)
  require('ai.rpc').shutdown(function()
    if transition == operation and not operation.closed then finish(true) end
  end)
  return true
end

return M
