local M = {
  "olimorris/codecompanion.nvim",
  dependencies = {
    "nvim-lua/plenary.nvim",
    "nvim-treesitter/nvim-treesitter",
    "nvim-telescope/telescope.nvim", -- Optional
    {
      "stevearc/dressing.nvim",      -- Optional: Improves the default Neovim UI
      opts = {},
    },
  },
  config = true
}

M.config = function()
  require("codecompanion").setup({
    adapters = {
      anthropic = function()
        return require("codecompanion.adapters").use("anthropic", {
          env = {
            api_key = "cmd:op read op://Private/nvim-anthropic/credential"
          },
        })
      end,
    },
    strategies = {
      chat = {
        adapter = "anthropic",
      },
      inline = {
        adapter = "anthropic",
      },
      agent = {
        adapter = "anthropic",
      },
    },
  })
end

return M
