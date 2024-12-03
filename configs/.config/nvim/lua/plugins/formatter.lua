local M = {
  "mhartington/formatter.nvim",
}

M.config = function()
  vim.keymap.set("n", "<leader>f", ":Format<CR>")

  require("formatter").setup {
    logging = true,
    log_level = vim.log.levels.ERROR,
    filetype = {
      yaml = {
        require("formatter.filetypes.yaml").prettier(),
      },
      cs = {
        require("formatter.filetypes.cs").csharpier(),
      },
      javascript = {
        require("formatter.filetypes.javascript").eslint_d(),
      },
      ["*"] = {
        require("formatter.filetypes.any").remove_trailing_whitespace,
        function()
          vim.lsp.buf.format({ async = true })
        end
      },
    }
  }
end


return M
