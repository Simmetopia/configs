vim.pack.add({
  'https://github.com/rafamadriz/friendly-snippets',
  'https://github.com/L3MON4D3/LuaSnip',
})

local ls = require('luasnip')

ls.setup({
  snip_env = {
    s = function(...)
      local snip = ls.s(...)
      table.insert(getfenv(2).ls_file_snippets, snip)
    end,
    parse = function(...)
      local snip = ls.parser.parse_snippet(...)
      table.insert(getfenv(2).ls_file_snippets, snip)
    end,
  },
})

require('luasnip.loaders.from_vscode').lazy_load()
require("luasnip.loaders.from_lua").load({ paths = { vim.fn.stdpath('config') .. "/snippets" } })

vim.keymap.set({ "i", "s" }, "<C-E>", function()
  if ls.choice_active() then
    ls.change_choice(1)
  end
end, { silent = true })
