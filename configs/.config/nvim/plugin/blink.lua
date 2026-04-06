vim.pack.add({
  'https://github.com/rafamadriz/friendly-snippets',
  'https://github.com/tpope/vim-dadbod',
  'https://github.com/kristijanhusak/vim-dadbod-completion',
  { src = 'https://github.com/saghen/blink.cmp', version = vim.version.range('1.x') },
})

require('blink.cmp').setup({
  fuzzy = { implementation = "rust" },
  sources = {
    default = { "lazydev", "lsp", "path", "snippets", "buffer" },
    per_filetype = {
      sql = { "snippets", "dadbod", "buffer" },
      mysql = { "snippets", "dadbod", "buffer" },
      plsql = { "snippets", "dadbod", "buffer" },
    },
    providers = {
      dadbod = {
        name = "Dadbod",
        module = "vim_dadbod_completion.blink",
      },
      lazydev = {
        name = "LazyDev",
        module = "lazydev.integrations.blink",
        score_offset = 100,
      },
    },
  },
})
