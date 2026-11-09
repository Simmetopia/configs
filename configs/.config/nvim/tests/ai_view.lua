-- Shared UI behavior without Pi processes or providers.
vim.opt.rtp:append(vim.fn.getcwd())
require('ai').setup(dofile('tests/fixtures/ai_setup.lua').options({ comments = { enabled = false } }))
local view = require('ai.ui.view')
local submitted, accept = {}, true
local v = view.new('/tmp/project', 'Pi test', 'i prompt · za fold · ^L clear · q hide', function() return 'Ready' end,
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
local function lines() return vim.api.nvim_buf_get_lines(v.buf, 0, -1, false) end
local function chunks(t) return table.concat(vim.tbl_map(function(c) return c[1] end, t), '') end
local cfg = vim.api.nvim_win_get_config(v.win)
assert(chunks(cfg.title):find('Pi test · /tmp/project', 1, true), 'title')
assert(chunks(cfg.footer):find('Ready', 1, true) and chunks(cfg.footer):find('za fold', 1, true), 'footer')
view.message(v, 'assistant', 'Old output')
key(v.buf, 'n', '<C-L>')
assert(#view.entries(v) == 0 and vim.api.nvim_buf_line_count(v.buf) == 1 and lines()[1] == '')
v.stream = function() return 'Active response' end
view.message(v, 'user', 'Old prompt')
view.clear(v)
assert(#view.entries(v) == 0)
assert(table.concat(lines(), '\n'):find('Active response', 1, true))
-- open state survives render
v.stream = function() return '' end
view.clear(v)
for i = 1, 3 do view.event(v, 'info', 'event ' .. i) end
view.render(v)
vim.api.nvim_win_set_cursor(v.win, { 1, 0 })
key(v.buf, 'n', 'za')
assert(lines()[1] == '▾ 3 events', lines()[1])
v.stream = function() return 'chunk' end
vim.api.nvim_win_set_cursor(v.win, { vim.api.nvim_buf_line_count(v.buf), 0 })
view.render(v)
view.render(v)
assert(lines()[1] == '▾ 3 events')
assert(vim.api.nvim_win_get_cursor(v.win)[1] == vim.api.nvim_buf_line_count(v.buf), 'follow')
key(v.buf, 'n', 'zM')
assert(lines()[1]:find('^▸ 3 events · '), lines()[1])
key(v.buf, 'n', 'zR')
assert(lines()[1] == '▾ 3 events')
vim.api.nvim_win_set_cursor(v.win, { 1, 0 })
key(v.buf, 'n', '<Tab>')
assert(lines()[1]:find('^▸ 3 events'))
vim.api.nvim_win_set_cursor(v.win, { vim.api.nvim_buf_line_count(v.buf), 0 })
key(v.buf, 'n', 'za') -- not a group line
v.stream = function() return '' end
-- finish after clear
view.clear(v)
local s = {}
view.add(v, require('ai.ui.tools').start(s, { toolCallId = 'x', toolName = 'read', args = { path = 'a' } }))
view.clear(v)
view.add(v, require('ai.ui.tools').finish(s, { toolCallId = 'x', toolName = 'read' }))
view.render(v)
local n = 0
for _, l in ipairs(lines()) do if l:match('^  %[read%] a$') then n = n + 1 end end
assert(n == 1 and #view.entries(v) == 1, 'finish after clear')
-- add is idempotent by uid
local only = view.entries(v)[1]
view.add(v, only)
assert(#view.entries(v) == 1)
-- trimming
local tl = require('ai.ui.timeline')
local limits = require('ai.config').options.limits
view.clear(v)
limits.history_lines = 10
local added = {}
for i = 1, 6 do
  added[i] = tl.message({ role = 'assistant', text = 'm' .. i })
  view.add(v, added[i])
end
assert(#view.entries(v) == 3 and view.entries(v)[1] == added[4], 'trim')
limits.history_lines = 350
view.clear(v)
-- border none uses the winbar
local ui = require('ai.config').options.ui
ui.border = 'none'
view.hide(v)
view.toggle(v)
assert(vim.wo[v.win].winbar:find('Ready', 1, true), 'winbar')
ui.border = 'single'
view.hide(v)
view.toggle(v)
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
