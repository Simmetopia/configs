local M  = {
  "NeogitOrg/neogit",
  dependencies = {
    "nvim-lua/plenary.nvim",         -- required
    "sindrets/diffview.nvim",        -- optional - Diff integration

    -- Only one of these is needed, not both.
    "nvim-telescope/telescope.nvim", -- optional
  },
  keys = {
    { "<leader>gs",":Neogit<CR>", desc = "open Neogit" }, -- Open Neogit
  },
  config = true
}

return M
