local M = {
  "junegunn/fzf.vim",
  "mbbill/undotree",
  "BurntSushi/ripgrep",
  "tpope/vim-dispatch",
  "tpope/vim-surround",
  "tpope/vim-unimpaired",
  {
    "vhyrro/luarocks.nvim",
    priority = 1000, -- Very high priority is required, luarocks.nvim should run as the first plugin in your config.
    config = true,
  }
}

return M
