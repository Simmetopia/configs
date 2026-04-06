local M = {
  "epwalsh/obsidian.nvim",
    dependencies = {
    -- Required.
    "nvim-lua/plenary.nvim",

    -- see below for full list of optional dependencies 👇
  },
  opts = {
    dir = "~/Documents/vaultish/",
    completion = {
      nvim_cmp = true, -- if using nvim-cmp, otherwise set to false
    },
  }
}

vim.api.nvim_set_keymap(
  "n",
  "<leader>os",
  ":ObsidianSearch<CR>",
  { noremap = true, silent = true }
)
vim.api.nvim_set_keymap(
  "n",
  "<leader>ot",
  ":ObsidianToday<CR>",
  { noremap = true, silent = true }
)
vim.api.nvim_set_keymap(
  "n",
  "<leader>on",
  ":ObsidianNew<CR>",
  { noremap = true, silent = true }
)

return M
