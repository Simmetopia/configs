vim.pack.add({
  'https://github.com/mason-org/mason.nvim',
  'https://github.com/mason-org/mason-lspconfig.nvim',
  'https://github.com/neovim/nvim-lspconfig',
})

require("mason").setup({
  registries = {
    "github:mason-org/mason-registry",
  },
})
require("mason-lspconfig").setup({})
