vim.pack.add({ "https://github.com/nvim-treesitter/nvim-treesitter" })

local ts = require('nvim-treesitter')

ts.setup {}
ts.install({
  "javascript", "typescript", "tsx", "elixir", "eex", "heex",
  "erlang", "nu", "bash", "graphql",
  "c_sharp",
  "terraform", "hcl",
  "html", "css",
  "json", "json5",
  "yaml",
  "toml",
  "xml",
  "markdown", "markdown_inline",
  "mermaid",
  "fish",
  "awk",
  "make",
  "ninja",
  "git_config",
  "git_rebase",
  "gitattributes",
  "gitcommit",
  "gitignore",
  "diff",
  "dockerfile",
  "nginx",
  "ssh_config",
  "sql",
  "scss",
  "vue",
  "svelte",
  "astro",
  "xml",
  "ocaml", "ocaml_interface",
  "haskell",
  "rust",
  "python",
  "regex",
  "jq",
  "lua",
  "luadoc",
  "vim",
  "vimdoc",
  "query",
  "comment",
  "printf",
  "http",
  "embedded_template",
})

vim.wo.foldexpr = 'v:lua.vim.treesitter.foldexpr()'
vim.wo.foldmethod = 'expr'
vim.wo.foldlevel = 99

vim.api.nvim_create_autocmd('FileType', {
  callback = function(args)
    pcall(vim.treesitter.start, args.buf)
  end,
})
