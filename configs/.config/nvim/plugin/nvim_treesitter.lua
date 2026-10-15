-- Tree-sitter: parser installation + highlight/fold, on the main line of
-- nvim-treesitter (https://github.com/nvim-treesitter/nvim-treesitter).
--
-- Replaces the old romus204/tree-sitter-manager.nvim setup. The install list
-- below is the "all mainstream languages/syntaxes you'll likely open"
-- default; prune it if you want a leaner build. Install is async and skips
-- already-present parsers, so on later startups it's a no-op.
vim.pack.add({ 'https://github.com/nvim-treesitter/nvim-treesitter' })

local ts = require('nvim-treesitter')
ts.setup {}

ts.install {
  -- web / frontend
  'html', 'css', 'scss', 'javascript', 'typescript', 'tsx',
  'vue', 'svelte', 'astro', 'mermaid',
  -- backend / systems
  'c', 'cpp', 'c_sharp', 'rust', 'go', 'zig', 'java', 'kotlin',
  'scala', 'swift', 'python', 'ruby', 'php', 'haskell', 'ocaml',
  'ocaml_interface', 'elixir', 'eex', 'heex', 'erlang', 'gdscript',
  -- docs / data / markup
  -- Markdown AI conversations use treesitter injections for fenced blocks.
  'markdown', 'markdown_inline', 'rst', 'latex',
  'json', 'json5', 'yaml', 'toml', 'xml', 'sql', 'proto', 'jq',
  'regex', 'printf',
  -- build / infra
  'cmake', 'make', 'ninja', 'dockerfile', 'nginx', 'ssh_config',
  'terraform', 'hcl',
  -- shell
  'bash', 'fish', 'nu', 'awk',
  -- vcs
  'diff', 'git_config', 'git_rebase', 'gitattributes', 'gitcommit', 'gitignore',
  -- editor / misc
  'lua', 'luadoc', 'vim', 'vimdoc', 'query', 'comment', 'http',
  'embedded_template', 'graphql',
}

-- Treesitter folding (glossary-set in lua/globals.lua too; the per-window
-- set below covers windows opened before startup).
vim.wo.foldmethod = 'expr'
vim.wo.foldexpr = 'v:lua.vim.treesitter.foldexpr()'
vim.wo.foldlevel = 99

-- Activate the parser for every filetype it exists for. Explicit start:
-- parsers are installed here but highlighting is left to nvim core, and
-- pcall lets filetypes without queries fall through silently.
vim.api.nvim_create_autocmd('FileType', {
  callback = function(args)
    pcall(vim.treesitter.start, args.buf)
  end,
})
