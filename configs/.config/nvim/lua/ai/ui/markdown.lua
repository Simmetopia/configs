-- Presentation shared by the project conversation and web chat floats.
local M = {}
local ns = vim.api.nvim_create_namespace('ai_conversation_markdown')

function M.setup(buf, win)
  vim.bo[buf].filetype = 'markdown'
  -- Start the markdown and markdown_inline parsers, including fenced-code language
  -- injections. The buffer is a nofile buffer, so there is no automatic parser start.
  pcall(vim.treesitter.start, buf, 'markdown')
  vim.wo[win].wrap = true
  vim.wo[win].linebreak = true
  vim.wo[win].conceallevel = require('ai.config').options.ui.conceallevel
  vim.wo[win].cursorline = false
end

function M.decorate(buf, lines)
  vim.api.nvim_buf_clear_namespace(buf, ns, 0, -1)
  for i = 1, math.min(3, #lines) do
    vim.api.nvim_buf_set_extmark(buf, ns, i - 1, 0, { line_hl_group = 'CursorLine' })
  end
  -- Give code fences their own visual surface, including while a block is streaming.
  local fence_char, fence_length
  for i, line in ipairs(lines) do
    local indent, fence, rest = line:match('^(%s*)([`~]+)(.*)$')
    if indent and #indent <= 3 and (fence:match('^`+$') or fence:match('^~+$')) and #fence >= 3 then
      if not fence_char then
        fence_char, fence_length = fence:sub(1, 1), #fence
      elseif fence:sub(1, 1) == fence_char and #fence >= fence_length and rest:match('^%s*$') then
        fence_char, fence_length = nil, nil
      end
      vim.api.nvim_buf_set_extmark(buf, ns, i - 1, 0, { line_hl_group = 'CursorLine' })
    elseif fence_char then
      vim.api.nvim_buf_set_extmark(buf, ns, i - 1, 0, { line_hl_group = 'CursorLine' })
    end
  end
end

-- Put the role on its own line: prefixing the first line of an answer breaks
-- headings, lists, and fenced code blocks in both syntax and Tree-sitter.
function M.message(role, text)
  return '\n### ' .. role .. '\n\n' .. text .. '\n'
end

return M
