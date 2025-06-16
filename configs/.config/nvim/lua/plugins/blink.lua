local M = { -- optional blink completion source for require statements and module annotations
  "saghen/blink.cmp",
  dependencies = {
    "kristijanhusak/vim-dadbod-completion",
    "tpope/vim-dadbod",
    'rafamadriz/friendly-snippets'
  },

  -- use a release tag to download pre-built binaries
  version = '1.*',
  opts = {
    fuzzy = { implementation = "rust" },
    sources = {
      -- add lazydev to your completion providers
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
          -- make lazydev completions top priority (see `:h blink.cmp`)
          score_offset = 100,
        },
      },
    },
  },
}

return M
