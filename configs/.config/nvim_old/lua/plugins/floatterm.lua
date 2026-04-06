local M = {
  "numToStr/FTerm.nvim",
  keys = {
    { "<F12>",      '<CMD>lua require("FTerm").toggle()<CR>' },
    { "<leader>lg", '<CMD>LazyGit<CR>' },
  },
  cmd = "FTerm",
  opts = {
    border = "single",
    dimensions = {
      height = 0.8,
      width = 0.8,
    },
  },
}

M.config = function(_, opts)
  local FTerm = require("FTerm")
  FTerm.setup(opts)
  vim.keymap.set('t', '<F12>', FTerm.toggle, { noremap = true, silent = true })


  local gitui = FTerm:new({
    ft = "fterm_gitui", -- You can also override the default filetype, if you want
    cmd = "lazygit",
    dimensions = {
      height = 0.9,
      width = 0.9,
    },
  })

  vim.api.nvim_create_user_command("LazyGit", function()
    gitui:toggle()
  end, { bang = true })
end
return M
