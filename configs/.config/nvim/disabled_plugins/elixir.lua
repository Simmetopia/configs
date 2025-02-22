local M =
{
  "elixir-tools/elixir-tools.nvim",
  event = { "BufReadPre", "BufNewFile" },
  config = function()
    local elixir = require("elixir")
    local elixirls = require("elixir.elixirls")

    elixir.setup {
      credo = { enable = true },
      nextls = { enable = false },
      elixirls = {
        enable = true,
        cmd = "/home/simmetopia/tmp/elixir-lsp-release/language_server.sh",
        settings = elixirls.settings {
          dialyzerEnabled = true,
          enableTestLenses = true,
        },
        on_attach = function(client, bufnr)
          vim.keymap.set("n", "<space>fp", ":ElixirFromPipe<cr>", { buffer = true, noremap = true })
          vim.keymap.set("n", "<space>tp", ":ElixirToPipe<cr>", { buffer = true, noremap = true })
          vim.keymap.set("v", "<space>em", ":ElixirExpandMacro<cr>", { buffer = true, noremap = true })
        end,
      }
    }
  end,
  dependencies = {
    "nvim-lua/plenary.nvim",
  },
}
-- return the module
return M
