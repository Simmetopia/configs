local M = {
  "kevinhwang91/nvim-bqf",
  opts = {
    event = "BufRead",
    config = function()
      require("bqf").setup({
        auto_enable = true,
        preview = {
          win_height = 12,
          win_vheight = 12,
          delay_syntax = 80,
          border_chars = { "┃", "┃", "━", "━", "┏", "┓", "┗", "┛", "█", "█" },
        },
        func_map = {
          fzffilter = "bzf",
        },
        filter = {
          fzf = {
            action_for = { ["ctrl-s"] = "split" },
            extra_opts = { "--bind", "ctrl-o:toggle-all", "--prompt", "> " },
          },
        },
      })
    end,
  },
  dependencies = {
    "junegunn/fzf",
  },

}
-- return the module
return M
