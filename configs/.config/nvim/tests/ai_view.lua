-- Shared UI behavior without Pi processes or providers.
vim.opt.rtp:append(vim.fn.getcwd())
require('ai').setup({ comments = { enabled = false } })
local view = require('ai.ui.view')
local submitted, accept = {}, true
local v = view.new('/tmp/project', 'Pi test', 'i: prompt  q: hide', function() return 'Ready' end,
  function() return '' end, function(text)
    if not accept then return false end
    submitted[#submitted + 1] = text
  end)
local function key(buf, mode, lhs)
  for _, map in ipairs(vim.api.nvim_buf_get_keymap(buf, mode)) do
    if map.lhs == lhs then return map.callback() end
  end
  error('missing mapping: ' .. lhs)
end
view.toggle(v)
view.input(v)
vim.api.nvim_buf_set_lines(v.input_buf, 0, -1, false, { 'first line', 'second line' })
key(v.input_buf, 'n', '<Esc>')
view.input(v)
assert(vim.api.nvim_buf_get_lines(v.input_buf, 0, -1, false)[2] == 'second line', 'draft lost on close')
accept = false
key(v.input_buf, 'n', '<C-S>')
assert(#submitted == 0 and v.input_win, 'rejected draft was closed')
accept = true
key(v.input_buf, 'n', '<C-S>')
assert(submitted[1] == 'first line\nsecond line')
assert(v.input_win == nil)
assert(vim.api.nvim_buf_get_lines(v.input_buf, 0, -1, false)[1] == '')
view.message(v, 'Pi', 'Old output')
key(v.buf, 'n', '<C-L>')
assert(#v.log == 0 and vim.api.nvim_buf_line_count(v.buf) == 4)
v.stream = function() return 'Active response' end
view.message(v, 'You', 'Old prompt')
view.clear(v)
assert(#v.log == 0)
assert(table.concat(vim.api.nvim_buf_get_lines(v.buf, 0, -1, false), '\n'):find('Active response', 1, true))
v.stream = function() return '' end
view.input(v)
local old_columns, old_lines = vim.o.columns, vim.o.lines
for _, size in ipairs({ { 100, 40 }, { 20, 8 } }) do
  vim.o.columns, vim.o.lines = size[1], size[2]
  vim.api.nvim_exec_autocmds('VimResized', {})
  for _, win in ipairs({ v.win, v.input_win }) do
    local cfg = vim.api.nvim_win_get_config(win)
    assert(cfg.width > 0 and cfg.height > 0)
    assert(cfg.col + cfg.width + 2 <= vim.o.columns)
    assert(cfg.row + cfg.height + 2 <= vim.o.lines)
  end
end
vim.o.columns, vim.o.lines = old_columns, old_lines
view.resize()
view.hide(v)
view.resize() -- closed windows must be ignored
print('AI view tests passed')
