local M = {
  "L3MON4D3/LuaSnip",
  -- follow latest release.
  version = "v2.*", -- Replace <CurrentMajor> by the latest released major (first number of latest release)
  -- install jsregexp (optional!).
  build = "make install_jsregexp",
  dependencies = {
    {
      'rafamadriz/friendly-snippets',
      config = function()
        require('luasnip.loaders.from_vscode').lazy_load()
      end,
    },
  },
}

M.config = function()
  local ls = require('luasnip')
  ls.setup({
    snip_env = {
      s = function(...)
        local snip = ls.s(...)
        -- we can't just access the global `ls_file_snippets`, since it will be
        -- resolved in the environment of the scope in which it was defined.
        table.insert(getfenv(2).ls_file_snippets, snip)
      end,
      parse = function(...)
        local snip = ls.parser.parse_snippet(...)
        table.insert(getfenv(2).ls_file_snippets, snip)
      end,
      -- remaining definitions.
    },
  })
  require("luasnip.loaders.from_lua").load({ paths = { "/home/simmetopia/.config/nvim/snippets" } })


  vim.keymap.set({ "i", "s" }, "<C-E>", function()
    if ls.choice_active() then
      ls.change_choice(1)
    end
  end, { silent = true })
end

return M
