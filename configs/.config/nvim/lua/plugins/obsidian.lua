local M = {
  "epwalsh/obsidian.nvim",
  dependencies = {
    "preservim/vim-markdown",
    "godlygeek/tabular",
    "nvim-lua/plenary.nvim",
  },
  opts = {
    dir = "~/vault/",
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
