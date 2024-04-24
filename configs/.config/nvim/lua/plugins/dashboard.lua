local M = {
  'nvimdev/dashboard-nvim',
  event = 'VimEnter',
  config = function()
    require('dashboard').setup {
      theme = 'hyper',
      config = {
        week_header = {
          enable = true,
        },
        shortcut = {
          { desc = '󰊳 Update', group = '@property', action = 'Lazy update', key = 'u' },
          { desc = '  Find File', key = 'f', action = 'Telescope find_files' },
          { desc = '󰉋 Find Project', key = 'p', action = 'TelescopeZoxide' },
          {
            desc = ' dotfiles',
            group = 'Number',
            action = function()
              vim.cmd('cd ~/.config/nvim/')
              vim.cmd('TelescopeConfig')
            end,
            key = 'd',
          },
        },
      },
      change_to_vcs_root = true,
    }
  end,
  dependencies = { { 'nvim-tree/nvim-web-devicons' } }
}

return M
