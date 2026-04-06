vim.pack.add({
  'https://github.com/junegunn/fzf',
  'https://github.com/kevinhwang91/nvim-bqf',
})

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
