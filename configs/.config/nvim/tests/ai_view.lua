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
-- fold_persists
local tl = require('ai.ui.timeline')
assert(vim.wo[v.win].foldenable == false, 'native folds disabled')
view.clear(v)
view.message(v, 'user', 'question')
view.message(v, 'assistant', 'a\nb\nc', { model = 'claude-x' })
view.render(v)
vim.api.nvim_set_current_win(v.win)
vim.api.nvim_win_set_cursor(v.win, { 6, 0 })
key(v.buf, 'n', 'za')
assert(lines()[4]:match('^## Pi') and lines()[5] == '' and #lines() == 5, vim.inspect(lines()))
assert(vim.api.nvim_win_get_cursor(0)[1] == 4, 'cursor on band')
view.event(v, 'info', 'x')
v.stream = function() return 'chunk' end
view.render(v)
assert(lines()[4]:match('^## Pi') and lines()[5] == '' and lines()[2] == 'question', vim.inspect(lines()))
v.stream = function() return '' end
key(v.buf, 'n', 'zR')
assert(lines()[5] == 'a' and #lines() >= 8, vim.inspect(lines()))
key(v.buf, 'n', 'zM')
assert(lines()[2] == '' and lines()[3]:match('^## Pi') and lines()[4] == '', vim.inspect(lines()))
vim.api.nvim_win_set_cursor(v.win, { 3, 0 })
key(v.buf, 'n', 'zo')
assert(lines()[4] == 'a')
key(v.buf, 'n', 'zc')
assert(lines()[4] == '')
key(v.buf, 'n', 'zR')
view.clear(v)
view.render(v)
assert(next(v.folded) == nil and next(v.open) == nil, 'clear resets folds')
-- history is held until H
view.clear(v)
view.message(v, 'user', 'current')
local r1 = tl.message({ role = 'user', text = 'old1', restored = true })
local r2 = tl.message({ role = 'assistant', text = 'old2', restored = true })
view.hold_history(v, { r1, r2 })
local list = view.entries(v)
assert(#list == 2 and list[2].kind == 'event' and list[2].text:find('2 earlier messages hidden', 1, true), 'held notice')
key(v.buf, 'n', 'H')
list = view.entries(v)
assert(list[1] == r1 and list[2] == r2 and list[3].text == 'current' and #list == 4, 'history shown first')
key(v.buf, 'n', 'H')
assert(#view.entries(v) == 4, 'second H adds nothing')
view.hold_history(v, { tl.message({ role = 'user', text = 'again', restored = true }) })
assert(#view.entries(v) == 4, 'second hold_history after H adds nothing')
view.reset(v)
view.hold_history(v, {})
assert(#view.entries(v) == 0, 'no event without history')
view.reset(v)
local h1, h2 = tl.message({ role = 'user', text = 'h1', restored = true }), tl.message({ role = 'user', text = 'h2', restored = true })
view.hold_history(v, { h1 })
view.hold_history(v, { h2 })
assert(#view.entries(v) == 1, 'second hold_history adds no second notice')
key(v.buf, 'n', 'H')
assert(#view.entries(v) == 2 and view.entries(v)[1] == h1, 'first held set kept')
view.reset(v)
view.hold_history(v, { h1 })
view.reset(v)
key(v.buf, 'n', 'H')
assert(#view.entries(v) == 0, 'reset drops held history')
-- held history is tracked per key and accumulates in arrival order
view.reset(v)
local k1, k2 = tl.message({ role = 'assistant', text = 'k1', restored = true }), tl.message({ role = 'assistant', text = 'k2', restored = true })
view.hold_history(v, { k1 }, 'edit:cheap')
view.hold_history(v, { k2 }, 'question:expensive')
view.hold_history(v, { tl.message({ role = 'assistant', text = 'dup', restored = true }) }, 'edit:cheap')
assert(#view.entries(v) == 2, 'one notice per new key, repeat key is a no-op')
assert(view.entries(v)[1].text:find('1 earlier messages hidden', 1, true) and view.entries(v)[2].text:find('1 earlier messages hidden', 1, true), 'notice per call')
key(v.buf, 'n', 'H')
list = view.entries(v)
assert(#list == 4 and list[1] == k1 and list[2] == k2, 'held entries from both keys shown in arrival order')
view.hold_history(v, { tl.message({ role = 'assistant', text = 'late', restored = true }) }, 'edit:cheap')
assert(#view.entries(v) == 4, 'key stays seen after H')
view.reset(v)
view.hold_history(v, { k1 }, 'edit:cheap')
view.reset(v)
view.hold_history(v, { k2 }, 'edit:cheap')
view.hold_history(v, { k1 }, 'question:expensive')
assert(#view.entries(v) == 2, 'reset clears seen per key')
view.reset(v)
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
-- notice follows H
view.reset(v)
view.hold_history(v, { tl.message({ role = 'user', text = 'old1', restored = true }), tl.message({ role = 'user', text = 'old2', restored = true }) }, 'k1')
view.hold_history(v, { tl.message({ role = 'user', text = 'old3', restored = true }) }, 'k2')
view.render(v)
local function has_line(text)
  for _, l in ipairs(vim.api.nvim_buf_get_lines(v.buf, 0, -1, false)) do if l:find(text, 1, true) then return true end end
end
assert(has_line('1 earlier messages hidden'), 'notice shown (info events collapse into a group)')
view.show_history(v)
local notices = {}
for _, e in ipairs(view.entries(v)) do if e.kind == 'event' then notices[#notices + 1] = e.text end end
assert(#notices == 2 and notices[1] == 'Resumed session — 2 earlier messages shown'
  and notices[2] == 'Resumed session — 1 earlier messages shown', 'notice text after H')
assert(not has_line('hidden (H to show)'), 'stale notice')
-- render falls back when the renderer errors
do
  local real = tl.render
  tl.render = function() error('boom') end
  view.clear(v)
  view.event(v, 'info', 'still visible')
  view.render(v)
  assert(has_line('timeline render failed') and has_line('still visible'), 'render fallback')
  tl.render = real
  view.clear(v)
  view.add(v, tl.event('info', nil))
  view.render(v)
end
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
-- resize re-renders: a long header truncates to the narrower window
view.clear(v)
view.add(v, tl.message({ role = 'user', label = ('x'):rep(80), text = 'hi' }))
vim.o.columns, vim.o.lines = 100, 40
view.resize()
local wide = vim.api.nvim_buf_get_lines(v.buf, 0, 1, false)[1]
vim.o.columns, vim.o.lines = 40, 20
view.resize()
local narrow = vim.api.nvim_buf_get_lines(v.buf, 0, 1, false)[1]
assert(vim.fn.strdisplaywidth(narrow) < vim.fn.strdisplaywidth(wide) and narrow:find('…', 1, true), 'resize re-render')
vim.o.columns, vim.o.lines = old_columns, old_lines
view.resize()
view.hide(v)
view.resize() -- closed windows must be ignored
print('AI view tests passed')
