vim.pack.add({
  'https://github.com/stevearc/oil.nvim',
  'https://github.com/echasnovski/mini.icons',
  'https://github.com/nvim-tree/nvim-web-devicons'
})

require('oil').setup({
  default_file_explorer = true,
  view_options = {
    show_hidden = true,
  },
  lsp_file_methods = {
    enabled = true,
  },
})

vim.keymap.set('n', '<leader>`', '<CMD>Oil<CR>', { desc = 'Oil file explorer' })
