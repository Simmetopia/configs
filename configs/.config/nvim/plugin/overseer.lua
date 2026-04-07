vim.pack.add({ 'https://github.com/stevearc/overseer.nvim' })

require('overseer').setup()

vim.keymap.set('n', '<leader>ot', ':OverseerToggle<CR>', { desc = "Overseer Toggle" })
vim.keymap.set('n', '<leader>orr', ':OverseerRun<CR>', { desc = "Overseer Run" })
vim.keymap.set('n', '<leader>orc', ':OverseerRunCmd', { desc = "Overseer Run CMD" })
