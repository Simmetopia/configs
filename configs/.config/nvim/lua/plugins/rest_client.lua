-- plugins/rest.lua
local M = {
  "rest-nvim/rest.nvim",
  ft = "http",
  dependencies = { "luarocks.nvim" },
}
M.config = function()
  vim.keymap.set({ 'n', 'v' }, 'rrr', "<Plug>Rest run", { noremap = true, silent = true })
  require("rest-nvim").setup({
  })
end

return M
