vim.pack.add({ 'https://github.com/rebelot/kanagawa.nvim' })

local kg = require("kanagawa")

kg.setup({
  compile = true,
  undercurl = true,
  commentStyle = { italic = true },
  functionStyle = {},
  keywordStyle = { italic = true },
  statementStyle = { bold = true },
  typeStyle = {},
  transparent = false,
  dimInactive = false,
  terminalColors = true,
  colors = {
    palette = {},
    theme = { wave = {}, lotus = {}, dragon = {}, all = {} },
  },
  overrides = function(colors)
    return {}
  end,
  theme = "wave",
  background = {
    dark = "wave",
    light = "lotus"
  },
})

kg.load("wave")
