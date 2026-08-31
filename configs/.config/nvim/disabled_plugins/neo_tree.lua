vim.pack.add({
  'https://github.com/nvim-lua/plenary.nvim',
  'https://github.com/nvim-tree/nvim-web-devicons',
  'https://github.com/MunifTanjim/nui.nvim',
  { src = 'https://github.com/nvim-neo-tree/neo-tree.nvim', version = vim.version.range('3.x') },
})

require("neo-tree").setup({
  filesystem = {
    bind_to_cwd = true,
    cwd_target = {
      sidebar = "tab",
      current = "window"
    },
    follow_current_file = {
      enabled = true,
      leave_dirs_open = false,
    },
  },
})

vim.keymap.set('n', '<leader>`', ':Neotree<CR>', { desc = "NVIMtree" })
