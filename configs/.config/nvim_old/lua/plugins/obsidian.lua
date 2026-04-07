local M = {
    "obsidian-nvim/obsidian.nvim",
  version = "*", -- use latest release, remove to use latest commit
  ---@module 'obsidian'
  ---@type obsidian.config
  opts = {
    dir = "~/Documents/vaultish/",
  }
}

vim.api.nvim_set_keymap(
  "n",
  "<leader>os",
  ":Obsidian search<CR>",
  { noremap = true, silent = true }
)
vim.api.nvim_set_keymap(
  "n",
  "<leader>ot",
  ":Obsidian today<CR>",
  { noremap = true, silent = true }
)
vim.api.nvim_set_keymap(
  "n",
  "<leader>on",
  ":Obsidian new<CR>",
  { noremap = true, silent = true }
)

vim.api.nvim_set_keymap(
  "n",
  "<leader>ob",
  ":Obsidian backlinks<CR>",
  { noremap = true, silent = true }
)

return M
