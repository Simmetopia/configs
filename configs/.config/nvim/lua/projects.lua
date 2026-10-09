-- Zoxide-backed workspace switching. Cleanup only touches already-loaded plugins.
local M = {}
local cleanups = {}
local switching = false
local options = { min_score = 1.5, shutdown_ms = 10000, mapping = '<leader>sp', listeners = {} }

local function notify(message, level)
  vim.notify('Projects: ' .. message, level or vim.log.levels.WARN)
end

-- A cleanup may return an idle predicate; switching waits for all predicates.
function M.register_cleanup(name, callback)
  cleanups[name] = callback
end

function M.parse(output)
  local entries, seen = {}, {}
  for line in output:gmatch('[^\r\n]+') do
    local score, path = line:match('^%s*([%d%.]+)%s+(.+)$')
    score = tonumber(score)
    if score and score > options.min_score and not seen[path] and vim.fn.isdirectory(path) == 1 then
      seen[path] = true
      entries[#entries + 1] = { score = score, path = path }
    end
  end
  table.sort(entries, function(a, b) return a.score > b.score end)
  return entries
end

local function has_changes()
  for _, buf in ipairs(vim.api.nvim_list_bufs()) do
    if vim.bo[buf].modified and vim.bo[buf].buftype ~= 'terminal' then return true end
  end
  return false
end

local function cleanup(context)
  local idle, invoked = {}, {}
  local function run(name, callback)
    invoked[name] = true
    local override = options.listeners[name]
    if override == false then return end
    callback = override or callback
    local ok, result = pcall(callback, context)
    if not ok then error(name .. ': ' .. tostring(result)) end
    if type(result) == 'function' then idle[#idle + 1] = result end
  end
  run('ai', function()
    for _, name in ipairs({ 'ai.comments', 'ai.chat' }) do
      local mod = package.loaded[name]
      if mod then mod.stop_all() end
    end
    local rpc = package.loaded['ai.rpc']
    if rpc then rpc.shutdown(); return rpc.is_idle end
  end)
  run('dap', function()
    local dap = package.loaded.dap
    if dap then
      dap.terminate({ all = true })
      local ui = package.loaded.dapui
      if ui then ui.close() end
      return function() return next(dap.sessions()) == nil end
    end
  end)
  run('overseer', function()
    local overseer = package.loaded.overseer
    if overseer then
      overseer.close()
      for _, task in ipairs(overseer.list_tasks()) do task:dispose(true) end
    end
  end)
  for name, callback in pairs(cleanups) do run(name, callback) end
  run('terminals', function()
    -- Includes hidden FTerm/LazyGit instances and DAP terminal buffers.
    local jobs = {}
    for _, buf in ipairs(vim.api.nvim_list_bufs()) do
      if vim.bo[buf].buftype == 'terminal' then
        local job = vim.b[buf].terminal_job_id
        if job then
          jobs[#jobs + 1] = job
          vim.fn.jobstop(job)
        end
      end
    end
    return function()
      for _, status in ipairs(vim.fn.jobwait(jobs, 0)) do
        if status == -1 then return false end
      end
      return true
    end
  end)
  for name, callback in pairs(options.listeners) do
    if not invoked[name] then run(name, callback) end
  end
  -- Other extensions can stop work before any buffers/cwd are changed.
  vim.api.nvim_exec_autocmds('User', { pattern = 'ProjectSwitchPre', modeline = false, data = context })
  assert(vim.wait(options.shutdown_ms, function()
    for _, predicate in ipairs(idle) do if not predicate() then return false end end
    return true
  end, 20), 'Extensions did not stop in time; cwd left unchanged')
end

function M.switch(path)
  if switching then notify('A switch is already in progress'); return false end
  if not path or vim.fn.isdirectory(path) ~= 1 then notify('Project directory no longer exists'); return false end
  path = vim.fn.fnamemodify(path, ':p'):gsub('/+$', '')
  if path == '' then path = '/' end
  if has_changes() then notify('Save or discard unsaved changes before switching'); return false end
  switching = true
  local old = vim.fn.getcwd()
  local ok, err = pcall(function()
    cleanup({ old = old, new = path })
    -- A process being stopped may have changed a buffer while we waited.
    assert(not has_changes(), 'Buffers changed during cleanup; save them before switching')
    vim.cmd('silent tabonly')
    vim.cmd('silent only')
    local buffers = vim.api.nvim_list_bufs()
    vim.cmd('enew')
    for _, buf in ipairs(buffers) do
      if vim.api.nvim_buf_is_valid(buf) then vim.api.nvim_buf_delete(buf, { force = true }) end
    end
    vim.fn.setqflist({}, 'r')
    -- :cd also clears surviving window/tab-local directories.
    vim.cmd.cd(path)
    vim.api.nvim_exec_autocmds('User', {
      pattern = 'ProjectSwitchPost', modeline = false, data = { old = old, new = path },
    })
    vim.system({ 'zoxide', 'add', path }, { text = true }, function() end)
  end)
  switching = false
  if not ok then notify(tostring(err), vim.log.levels.ERROR); return false end
  notify('Switched to ' .. path, vim.log.levels.INFO)
  return true
end

function M.pick()
  if vim.fn.executable('zoxide') ~= 1 then notify('zoxide is not installed'); return end
  vim.system({ 'zoxide', 'query', '--list', '--score' }, { text = true }, function(result)
    vim.schedule(function()
      if result.code ~= 0 then notify('zoxide query failed: ' .. (result.stderr or '')); return end
      local entries = M.parse(result.stdout or '')
      if #entries == 0 then notify('No directories with a zoxide score > ' .. options.min_score); return end
      vim.ui.select(entries, {
        prompt = 'Projects (zoxide score > ' .. options.min_score .. ')',
        format_item = function(entry) return string.format('%6.1f  %s', entry.score, entry.path) end,
      }, function(entry) if entry then M.switch(entry.path) end end)
    end)
  end)
end

function M.setup(opts)
  options = vim.tbl_extend('force', options, opts or {})
  for name, callback in pairs(options.listeners) do
    assert(type(callback) == 'function' or callback == false, 'Invalid project listener: ' .. name)
  end
  vim.api.nvim_create_user_command('ProjectSwitch', function(args)
    if args.args == '' then M.pick() else M.switch(args.args) end
  end, { nargs = '?', complete = 'dir', desc = 'Pick or switch project' })
  vim.api.nvim_create_user_command('Projects', M.pick, { desc = 'Switch project using zoxide' })
  if options.mapping then vim.keymap.set('n', options.mapping, M.pick, { desc = '[S]earch [P]rojects' }) end
end

return M
