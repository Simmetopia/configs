local M = {
  'stevearc/overseer.nvim',
  opts = {},
  keys = {
    { '<leader>ot',   ':OverseerToggle<CR>',      desc = "Overseer Toggle" },
    { '<leader>orr',  ':OverseerRun<CR>',         desc = "Overseer Run" },
    { '<leader>orc',  ':OverseerRunCmd',          desc = "Overseer Run CMD" },
  },
}

M.config = function()
  local overseer = require('overseer')
  overseer.setup()
  -- Register a custom task template for Codeium Chat
end

return M
