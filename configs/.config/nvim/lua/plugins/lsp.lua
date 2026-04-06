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

  vim.lsp.config('ocamllsp', {
    cmd = { vim.fn.expand('/home/simmetopia/code/itminds/aoc-ocaml/2025/_opam/bin/ocamllsp') },
    root_markers = { '.git', 'dune-project', 'dune-workspace' },
  })
  vim.lsp.enable('ocamllsp')
  -- Configure csharp_ls to find dotnet BEFORE mason-lspconfig sets it up
  -- Mason-lspconfig will now use the configuration we set above
  require("mason-lspconfig").setup({
  })
end

return M
