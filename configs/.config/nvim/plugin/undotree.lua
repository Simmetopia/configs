vim.pack.add({ 'https://github.com/mbbill/undotree' })

vim.keymap.set('n', '<leader>u', '<CMD>UndotreeToggle<CR>', { desc = 'Undotree toggle' })
