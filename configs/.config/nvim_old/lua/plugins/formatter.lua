local M = {
  "mhartington/formatter.nvim",
}

-- Function to check if prettier is installed
local function prettier_is_available()
  local result = vim.fn.executable('prettier')
  return result == 1
end

M.config = function()
  vim.keymap.set("n", "<leader>f", ":Format<CR>")

  local filetype_config = {
    yaml = {
      require("formatter.filetypes.yaml").prettier(),
    },
    cs = {
      require("formatter.filetypes.cs").csharpier(),
    }
  }

  -- JavaScript-related file types that can use Prettier
  local js_filetypes = {
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact",
  }

  -- Apply the same formatter logic to all JavaScript-related file types
  for _, ft in ipairs(js_filetypes) do
    filetype_config[ft] = {
      try_node_modules = true,
      function()
        if prettier_is_available() then
          return require("formatter.filetypes." .. ft).prettier()
        end
      end,
    }
  end

  filetype_config["*"] = {
    require("formatter.filetypes.any").remove_trailing_whitespace,
    function()
      vim.lsp.buf.format({ async = false })
    end
  }

  -- Set up formatter with our configuration
  require("formatter").setup {
    logging = true,
    log_level = vim.log.levels.INFO,
    filetype = filetype_config
  }
end

return M
