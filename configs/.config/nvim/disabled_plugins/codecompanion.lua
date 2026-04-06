local M = {
  "olimorris/codecompanion.nvim",
  opts = {},
  dependencies = {
    { "nvim-lua/plenary.nvim", branch = "master" }, },
}

M.config = function()
  require("codecompanion").setup({
    adapters = {
      acp = {
        claude_code = function()
          return require("codecompanion.adapters").extend("claude_code", {
            env = {
              CLAUDE_CODE_OAUTH_TOKEN =
              "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",
            },
          })
        end,
      },
    },
  })
end
return M
