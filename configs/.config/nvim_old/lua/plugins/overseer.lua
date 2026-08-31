local M = {
  'stevearc/overseer.nvim',
  opts = {},
  keys = {
    { '<leader>ot',  ':OverseerToggle<CR>', desc = "Overseer Toggle" },
    { '<leader>orr', ':OverseerRun<CR>',    desc = "Overseer Run" },
    { '<leader>orc', ':OverseerShell<CR>',  desc = "Overseer Run CMD in shell" },
  },
}

M.config = function()
  local overseer = require('overseer')
  overseer.setup()

  vim.api.nvim_create_user_command("OverseerRestartLast", function()
    local task_list = require("overseer.task_list")
    local tasks = overseer.list_tasks({
      status = {
        overseer.STATUS.SUCCESS,
        overseer.STATUS.FAILURE,
        overseer.STATUS.CANCELED,
      },
      sort = task_list.sort_finished_recently
    })
    if vim.tbl_isempty(tasks) then
      vim.notify("No tasks found", vim.log.levels.WARN)
    else
      local most_recent = tasks[1]
      overseer.run_action(most_recent, "restart")
    end
  end, {})

  vim.keymap.set('n', '<leader>ors', ':OverseerRestartLast<CR>')
end

return M
