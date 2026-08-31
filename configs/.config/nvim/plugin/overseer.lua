vim.pack.add({ 'https://github.com/stevearc/overseer.nvim' })

local overseer = require('overseer')

overseer.setup({
  -- Patch nvim-dap so launch configs can use preLaunchTask / postDebugTask.
  -- Inert until a config in plugin/dap.lua actually declares one.
  dap = true,

  output = {
    -- Keep previous output visible when a task restarts.
    preserve_output = true,
  },

  task_list = {
    direction = 'bottom',
    min_height = 12,
    max_height = { 25, 0.3 },
    keymaps = {
      ['R'] = { 'keymap.run_action', opts = { action = 'restart' }, desc = 'Restart task' },
      ['X'] = { 'keymap.run_action', opts = { action = 'stop' }, desc = 'Stop task' },
    },
  },

  component_aliases = {
    -- Successes clean themselves up after 2 minutes; failures and cancels stay
    -- in the task list until dismissed with `dd`.
    default = {
      'on_exit_set_status',
      'on_complete_notify',
      { 'on_complete_dispose', statuses = { 'SUCCESS' }, timeout = 120 },
    },
    default_vscode = {
      'default',
      'on_result_diagnostics',
    },
  },
})

-- Restart the most recently finished task without going through a picker.
vim.api.nvim_create_user_command('OverseerRestartLast', function()
  local task_list = require('overseer.task_list')
  local tasks = overseer.list_tasks({
    status = {
      overseer.STATUS.SUCCESS,
      overseer.STATUS.FAILURE,
      overseer.STATUS.CANCELED,
    },
    sort = task_list.sort_finished_recently,
  })
  if vim.tbl_isempty(tasks) then
    vim.notify('No finished tasks to restart', vim.log.levels.WARN)
  else
    overseer.run_action(tasks[1], 'restart')
  end
end, { desc = 'Restart most recently finished task' })

-- Dump the newest task's output into the quickfix list (rendered by nvim-bqf).
vim.api.nvim_create_user_command('OverseerQuickfixLast', function()
  local tasks = overseer.list_tasks({
    sort = function(a, b)
      return (a.time_start or 0) > (b.time_start or 0)
    end,
  })
  if vim.tbl_isempty(tasks) then
    vim.notify('No tasks', vim.log.levels.WARN)
  else
    overseer.run_action(tasks[1], 'open output in quickfix')
  end
end, { desc = "Newest task's output -> quickfix" })

-- Non-blocking :make replacement. `:Make!` runs without opening quickfix.
vim.api.nvim_create_user_command('Make', function(params)
  local cmd, subs = vim.o.makeprg:gsub('%$%*', params.args)
  if subs == 0 then
    cmd = cmd .. ' ' .. params.args
  end
  overseer
    .new_task({
      cmd = vim.fn.expandcmd(cmd),
      components = {
        {
          'on_output_quickfix',
          open = not params.bang,
          open_height = 12,
          errorformat = vim.o.errorformat,
        },
        'default',
      },
    })
    :start()
end, { desc = 'Run makeprg as an overseer task', nargs = '*', bang = true })

-- Non-blocking :grep replacement. `:Grep!` runs without opening quickfix.
vim.api.nvim_create_user_command('Grep', function(params)
  local cmd, subs = vim.o.grepprg:gsub('%$%*', params.args)
  if subs == 0 then
    cmd = cmd .. ' ' .. params.args
  end
  overseer
    .new_task({
      cmd = vim.fn.expandcmd(cmd),
      components = {
        {
          'on_output_quickfix',
          errorformat = vim.o.grepformat,
          open = not params.bang,
          open_height = 12,
          items_only = true,
        },
        -- No reason to keep these around as long as normal tasks.
        { 'on_complete_dispose', timeout = 30 },
        'default',
      },
    })
    :start()
end, { desc = 'Run grepprg as an overseer task', nargs = '*', bang = true, complete = 'file' })

-- Warm the template cache so :OverseerRun opens instantly instead of waiting on
-- the mise/npm/cargo/make providers to scan the project.
vim.api.nvim_create_autocmd({ 'VimEnter', 'DirChanged' }, {
  desc = 'Preload overseer templates for the cwd',
  callback = function()
    local dir = (vim.v.cwd ~= '' and vim.v.cwd) or vim.fn.getcwd()
    overseer.preload_task_cache({ dir = dir })
  end,
})

-- :OS <cmd>  ->  :OverseerShell <cmd>
vim.cmd.cnoreabbrev('OS OverseerShell')

-- Project-local tasks come from a .nvim.lua in the project root, enabled by
-- `vim.opt.exrc` in lua/globals.lua (it has to be set before plugin/ loads).
--
-- exrc is sourced before this file runs, so overseer is not on the runtimepath
-- yet. Project files must defer registration to the event loop:
--
--   -- <project>/.nvim.lua
--   vim.schedule(function()
--     require('overseer').register_template({
--       name = 'deploy dev',
--       -- keeps the task scoped to this project after a :cd elsewhere
--       condition = { dir = vim.fn.getcwd() },
--       builder = function()
--         return { cmd = { 'databricks', 'bundle', 'deploy', '-t', 'dev' } }
--       end,
--     })
--   end)

vim.keymap.set('n', '<leader>ot', ':OverseerToggle<CR>', { desc = 'Overseer Toggle' })
vim.keymap.set('n', '<leader>orr', ':OverseerRun<CR>', { desc = 'Overseer Run' })
-- Intentionally no <CR>: leaves the cmdline open so the command can be typed.
vim.keymap.set('n', '<leader>orc', ':OverseerShell', { desc = 'Overseer Run CMD' })
vim.keymap.set('n', '<leader>ors', ':OverseerRestartLast<CR>', { desc = 'Overseer Restart Last' })
vim.keymap.set('n', '<leader>oa', ':OverseerTaskAction<CR>', { desc = 'Overseer Task Action' })
vim.keymap.set('n', '<leader>oq', ':OverseerQuickfixLast<CR>', { desc = 'Overseer Output -> Quickfix' })
