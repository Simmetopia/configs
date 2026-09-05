vim.pack.add({
  'https://github.com/nvim-lua/plenary.nvim',
  'https://github.com/dlyongemallo/diffview-plus.nvim',
  'https://github.com/NeogitOrg/neogit',
})

require('neogit').setup()

vim.keymap.set('n', '<leader>gs', ':Neogit<CR>', { desc = "open Neogit" })
