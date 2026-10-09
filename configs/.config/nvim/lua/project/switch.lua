-- The switch pipeline: guard -> ProjectSwitchPre (vetoable) -> :cd -> session
-- restore -> zoxide rank bump -> ProjectSwitchPost. Owns no registrations; the
-- public surface lives in require('project').
local M = {}

local abort_requested = false

local function options()
  return require('project').options
end

local function notify(msg, level)
  if options().notify == false then return end
  vim.notify('project: ' .. msg, level or vim.log.levels.INFO)
end

-- True when `path` is `root` itself or nested inside it.
local function inside(path, root)
  return root == '/' or path == root or path:sub(1, #root + 1) == root .. '/'
end

-- Veto hook: a ProjectSwitchPre listener calls require('project').abort_switch()
-- and the pipeline bails at the next step boundary.
function M.abort()
  abort_requested = true
end

function M.switch(target, opts)
  opts = opts or {}
  local git = require('project.git')
  local sessions = require('project.sessions')
  local zoxide = require('project.zoxide')
  local project = require('project')

  local real = vim.uv.fs_realpath(tostring(target or ''))
  if not real then
    notify('unknown path: ' .. tostring(target), vim.log.levels.WARN)
    return nil
  end

  local old = project.current()

  -- Plain :cd escape hatch (<leader>zc): no normalize, sessions, rank, events.
  -- It is literally a vim :cd through a picker.
  if opts.cd_only then
    if real == old then
      notify('already in ' .. real)
      return false
    end
    vim.cmd.cd(real)
    return true
  end

  local new = real
  if options().git.normalize_root then
    new = git.nearest(real) or real
  end

  -- Guard / no-op: switching to where we effectively already are prevents
  -- re-entrancy (e.g. DirChanged listeners) and double rank bumps.
  if new == old or (not options().git.normalize_root and inside(old, new)) then
    notify('already in ' .. new)
    return false
  end

  abort_requested = false
  vim.api.nvim_exec_autocmds('User', {
    pattern = 'ProjectSwitchPre', modeline = false,
    data = { old = old, new = new },
  })
  if abort_requested then
    abort_requested = false
    notify('switch aborted', vim.log.levels.WARN)
    return false
  end

  -- Ordering matters: cwd first (DirChanged -> overseer task preload for the
  -- new cwd; keep plugin/overseer.lua), only then layout, only then rank, and
  -- finally the post event for AI re-targeting etc.
  vim.cmd.cd(new)
  if abort_requested then
    abort_requested = false
    notify('switch aborted', vim.log.levels.WARN)
    return false
  end

  local session_restored = false
  if not opts.no_restore then
    session_restored = sessions.restore(new)
  end
  if abort_requested then
    abort_requested = false
    notify('switch aborted', vim.log.levels.WARN)
    return false
  end

  -- Explicit switch is worth a rank tick; we deliberately never `zoxide add`
  -- on every :cd (keeps the DB honest, avoids rank inflation from restores).
  if not opts.no_rank then
    zoxide.add(new)
  end

  vim.api.nvim_exec_autocmds('User', {
    pattern = 'ProjectSwitchPost', modeline = false,
    data = { old = old, new = new, session_restored = session_restored },
  })

  notify('switched to ' .. new)
  return true
end

return M
