vim.pack.add({
  "https://github.com/pwntester/octo.nvim",
  "https://github.com/nvim-lua/plenary.nvim",
  "https://github.com/ibhagwan/fzf-lua",
  "https://github.com/nvim-tree/nvim-web-devicons" }
)

require("octo").setup({
  picker = "fzf-lua",
  enable_builtin = true
})
