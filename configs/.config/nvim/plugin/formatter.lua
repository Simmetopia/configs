vim.pack.add({ 'https://github.com/mhartington/formatter.nvim' })

local function prettier_is_available()
  return vim.fn.executable('prettier') == 1
end

vim.keymap.set("n", "<leader>f", ":Format<CR>")

local filetype_config = {
  yaml = {
    require("formatter.filetypes.yaml").prettier(),
  },
  cs = {
    require("formatter.filetypes.cs").csharpier(),
  }
}

local js_filetypes = {
  "javascript",
  "javascriptreact",
  "typescript",
  "typescriptreact",
}

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

require("formatter").setup {
  logging = true,
  log_level = vim.log.levels.INFO,
  filetype = filetype_config
}
