vim.pack.add({ 'https://github.com/rebelot/kanagawa.nvim' })

require("kanagawa").setup({
  background = {
    dark = "lotus",
    light = "lotus"
  },
})

vim.cmd.colorscheme "kanagawa"
