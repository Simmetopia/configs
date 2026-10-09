-- Public API + setup for the zoxide project switcher. All global registrations
-- (commands, mappings, autocmds) are owned by setup(); submodules register
-- none, at import time or otherwise. Submodules read M.options lazily, which
-- is safe because setup() runs from plugin/project.lua before any user command.
local M = {}

local switch = require('project.switch')
local picker = require('project.picker')
local sessions = require('project.sessions')
local git = require('project.git')
local zoxide = require('project.zoxide')

M.defaults = {
  zoxide = { bin = 'zoxide', data_dir = nil, resolve_symlinks = false, exclude = {} },
  git = { normalize_root = true }, -- pick a subdir? jump to nearest .git ancestor
  sessions = {
    enabled = true,
    dir = vim.fn.stdpath('state') .. '/project-sessions',
    autosave = true,     -- on VimLeavePre, non-blocking
    auto_restore = true, -- restore layout on switch when a snapshot exists
    prune = 20,          -- keep newest N snapshots globally
  },
  picker = { preview = true },
  notify = true,
}
M.options = {}

local function notify(msg, level)
  if M.options.notify == false then return end
  vim.notify('project: ' .. msg, level or vim.log.levels.INFO)
end

function M.setup(options)
  if not M.setup_done then
    M.options = vim.tbl_deep_extend('force', vim.deepcopy(M.defaults), options or {})
    M.options.sessions.dir = vim.fn.expand(M.options.sessions.dir) or M.options.sessions.dir

    vim.api.nvim_create_user_command('Z', function(params)
      M.pick({ terms = vim.split(params.args or '', '%s+', { trimempty = true }) })
    end, { nargs = '*', desc = 'Zoxide project picker (optional live query terms)' })

    vim.api.nvim_create_user_command('ZAdd', function(params)
      local path = params.fargs[1] or vim.fn.getcwd()
      zoxide.add(path)
      notify('zoxide add ' .. path)
    end, { nargs = '*', complete = 'dir', desc = 'Zoxide add cwd or PATH' })

    vim.api.nvim_create_user_command('ZPrune', function()
      picker.pick({ prune = true })
    end, { desc = 'Multi-select zoxide entries to remove' })

    vim.api.nvim_create_user_command('ZSave', function()
      sessions.save(M.current())
    end, { desc = 'Save current project layout snapshot' })

    vim.api.nvim_create_user_command('ZThis', function()
      local name = vim.api.nvim_buf_get_name(0)
      local target = name ~= '' and vim.fs.dirname(name) or vim.fn.getcwd()
      M.switch(target)
    end, { desc = 'Switch to current buffer project root (git root normalize)' })

    vim.keymap.set('n', '<leader>zp', function() M.pick() end, { desc = 'Zoxide project picker' })
    vim.keymap.set('n', '<leader>zc', function() M.pick({ cd_only = true }) end, { desc = 'Plain :cd via zoxide picker' })
    vim.keymap.set('n', '<leader>zs', function() sessions.save(M.current()) end, { desc = 'Save project session' })

    if M.options.sessions.enabled and M.options.sessions.autosave then
      vim.api.nvim_create_autocmd('VimLeavePre', {
        group = vim.api.nvim_create_augroup('Project', { clear = true }),
        callback = function()
          local root = M.current()
          if root then sessions.save(root) end
        end,
      })
    end

    M.setup_done = true
  end
  return M
end

-- getcwd() realpath — this is what switch() no-ops against after :cd.
function M.current()
  return vim.uv.fs_realpath(vim.fn.getcwd()) or vim.fn.getcwd()
end

function M.switch(target, opts)
  return switch.switch(target, opts)
end

function M.pick(opts)
  return picker.pick(opts)
end

-- Veto a pending switch (called by ProjectSwitchPre listeners).
function M.abort_switch()
  switch.abort()
end

-- One-line rank helpers (thick wrappers over zoxide.lua).
M.zoxide = zoxide
M.git = git
M.sessions = sessions

return M
