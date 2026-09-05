vim.pack.add({
  'https://github.com/rafamadriz/friendly-snippets',
  'https://github.com/L3MON4D3/LuaSnip',
})

local ls = require('luasnip')

-- LuaSnip refuses text nodes containing newlines ("'replacement string' item
-- contains newlines"), which is the single easiest way to write a broken
-- snippet file. Split them into the list-of-lines form LuaSnip wants instead.
local function text_node(text, ...)
  if type(text) == 'string' and text:find('\n', 1, true) then
    text = vim.split(text, '\n', { plain = true })
  end
  return ls.text_node(text, ...)
end

ls.setup({
  -- Snippet files under snippets/<filetype>/ use the standard form:
  --   return { s('trig', { ... }, { desc = '...' }) }
  snip_env = {
    t = text_node,
  },
})

require('luasnip.loaders.from_vscode').lazy_load()
require('luasnip.loaders.from_lua').load({ paths = { vim.fn.stdpath('config') .. '/snippets' } })

vim.keymap.set({ "i", "s" }, "<C-E>", function()
  if ls.choice_active() then
    ls.change_choice(1)
  end
end, { silent = true })
