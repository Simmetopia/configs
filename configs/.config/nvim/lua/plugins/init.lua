local M = {
  "jparise/vim-graphql",
  "junegunn/fzf.vim",
  "mbbill/undotree",
  "benmills/vimux",
  "lukas-reineke/headlines.nvim",
  "elixir-editors/vim-elixir",
  "BurntSushi/ripgrep",
  "tpope/vim-dispatch",
  "tpope/vim-surround",
  "tpope/vim-unimpaired",
  {
    "vhyrro/luarocks.nvim",
    priority = 1000, -- Very high priority is required, luarocks.nvim should run as the first plugin in your config.
    config = true,
  }
  -- {
  -- 	dir = "/home/simmetopia/code/gizzty",
  -- 	config = function()
  -- 		require("gizzty").setup()
  -- 	end,
  -- },
}

return M
