local M = {
  "neovim/nvim-lspconfig",
  lazy = false,
  dependencies = {
    -- LSP Support
    { "mason-org/mason-lspconfig.nvim" },
    { "mason-org/mason.nvim" },
  },
}

M.config = function()
  -- Mason setup
  require("mason").setup({})

  -- Mason-lspconfig will now use the configuration we set above
  require("mason-lspconfig").setup({
  })
  vim.lsp.enable({'nushell'})
end

return M
