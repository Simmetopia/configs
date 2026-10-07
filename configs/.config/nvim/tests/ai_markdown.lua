-- Run: nvim --headless -u NONE -l tests/ai_markdown.lua
vim.opt.rtp:append(vim.fn.getcwd())
local markdown = require('ai.ui.markdown')
local buf = vim.api.nvim_create_buf(false, true)
vim.bo[buf].buftype = 'nofile'
local win = vim.api.nvim_open_win(buf, true, { relative = 'editor', row = 1, col = 1, width = 70, height = 18 })
markdown.setup(buf, win)
assert(vim.bo[buf].filetype == 'markdown')
assert(vim.wo[win].conceallevel == 0)
local lines = vim.split('Header\nStatus\nHelp\n' .. markdown.message('Pi', '# Title\n\n- Item\n\n```lua\nlocal x = 1\n```'), '\n', { plain = true })
vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
markdown.decorate(buf, lines)
assert(lines[5] == '### Pi' and lines[7] == '# Title')
local fence, body = 0, 0
for i, line in ipairs(lines) do
  if line == '```lua' then fence = i end
  if line == 'local x = 1' then body = i end
end
assert(fence > 0 and body == fence + 1)
local ns = vim.api.nvim_get_namespaces().ai_conversation_markdown
assert(#vim.api.nvim_buf_get_extmarks(buf, ns, { body - 1, 0 }, { body - 1, -1 }, { details = true }) == 1)
local parser = vim.treesitter.get_parser(buf, 'markdown')
parser:parse(true)
local has_lua = false
for _, child in pairs(parser:children()) do
  if child:lang() == 'lua' then has_lua = true end
end
-- A missing code-language parser should not prevent the markdown view opening.
if vim.treesitter.language.add('lua') then assert(has_lua, 'fenced Lua code was not injected') end
-- The same injection works for Python when its parser is installed.
if vim.treesitter.language.add('python') then
  local python_lines = { '### Pi', '', '```python', 'from hypothesis import given', '```' }
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, python_lines)
  parser:parse(true)
  assert(parser:children().python, 'fenced Python code was not injected')
end
print('AI markdown tests passed')
