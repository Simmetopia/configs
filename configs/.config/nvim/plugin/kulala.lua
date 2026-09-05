vim.pack.add({ 'https://github.com/mistweaverco/kulala.nvim' })

vim.filetype.add({
  extension = {
    ['http'] = 'http',
    ['rest'] = 'http',
  },
})

require('kulala').setup({
  global_keymaps = true,
})
