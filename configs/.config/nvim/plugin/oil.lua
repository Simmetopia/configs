vim.pack.add({
  'https://github.com/nvim-tree/nvim-web-devicons',
  'https://github.com/stevearc/oil.nvim',
})

require("oil").setup({
  default_file_explorer = true,
  lsp_file_methods = {
    enabled = true,
    timeout_ms = 1000,
    autosave_changes = false,
  },
  view_options = {
    show_hidden = true,
  },
})

vim.keymap.set('n', '<leader>`', '<CMD>Oil<CR>', { desc = "Oil file explorer" })
