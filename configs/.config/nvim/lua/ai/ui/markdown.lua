-- Presentation shared by the project conversation and web chat floats.
local M = {}

function M.setup(buf, win)
  vim.bo[buf].filetype = 'markdown'
  -- Start the markdown and markdown_inline parsers, including fenced-code language
  -- injections. The buffer is a nofile buffer, so there is no automatic parser start.
  pcall(vim.treesitter.start, buf, 'markdown')
  vim.wo[win].wrap = true
  vim.wo[win].linebreak = true
  vim.wo[win].conceallevel = require('ai.config').options.ui.conceallevel
  vim.wo[win].cursorline = false
  vim.wo[win].foldenable = false
end

return M
