vim.pack.add {
  "https://github.com/romus204/tree-sitter-manager.nvim" }

-- Markdown AI conversations use Tree-sitter injections for fenced code blocks.
-- A Python filetype autocmd cannot install this parser from inside a Markdown buffer.
require("tree-sitter-manager").setup({ ensure_installed = { "markdown", "markdown_inline", "python" } })
