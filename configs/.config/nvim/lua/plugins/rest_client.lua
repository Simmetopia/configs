-- plugins/rest.lua
local M = {
  "rest-nvim/rest.nvim",
  dependencies = { { "nvim-lua/plenary.nvim" } }
}
M.config = function()
  vim.keymap.set({ 'n', 'v' }, 'rrr', "<Plug>RestNvim", { noremap = true, silent = true })
  require("rest-nvim").setup({
    --- Get the same options from Packer setup
    formatters = {
      json = "jq"
    }
  })
end

return M
