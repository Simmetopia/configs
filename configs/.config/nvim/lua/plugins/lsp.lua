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
  vim.api.nvim_create_autocmd('LspAttach', {
    desc = 'LSP actions',
    callback = function(args)
      local bufnr = args.buf
      local client = vim.lsp.get_client_by_id(args.data.client_id)
      if not client then
        return
      end

      local opts = { buffer = bufnr, remap = false }

      vim.keymap.set("n", "gd", vim.lsp.buf.definition, opts)
      vim.keymap.set("n", "K", vim.lsp.buf.hover, opts)
      vim.keymap.set("n", "<leader>vd", vim.diagnostic.open_float, opts)
      vim.keymap.set("n", "[d", function()
        vim.diagnostic.jump({ count = 1, float = true })
      end, opts)
      vim.keymap.set("n", "]d", function()
        vim.diagnostic.jump({ count = -1, float = true })
      end, opts)
      vim.keymap.set("n", "<leader>vca", vim.lsp.buf.code_action, opts)
      vim.keymap.set("n", "<leader>vrn", vim.lsp.buf.rename, opts)
      vim.keymap.set("i", "<C-h>", vim.lsp.buf.signature_help, opts)
    end,
  })

  -- Mason setup
  require("mason").setup({})
  require("mason-lspconfig").setup()

end

return M
