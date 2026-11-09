vim.opt.rtp:append(vim.fn.getcwd())
require('ai').setup(dofile('tests/fixtures/ai_setup.lua').options({ comments = { enabled = false } }))
local t = require('ai.ui.timeline')
local function has_mark(out, row, key, value)
  for _, m in ipairs(out.marks) do if m[1] == row and m[3][key] == value then return true end end
end
-- short_model
assert(t.short_model('eu.anthropic.claude-opus-5-5') == 'claude-opus-5-5')
assert(t.short_model('gpt-6-luna-2026-09-22') == 'gpt-6-luna')
-- bands
local user = t.message({ role = 'user', text = 'Refactor', label = 'AI! lua/a.lua:42' })
local pi = t.message({ role = 'assistant', text = 'Done', model = 'eu.anthropic.claude-opus-5-5' })
local old = t.message({ role = 'assistant', text = 'Earlier', restored = true })
local out = t.render({ user, pi, old }, { width = 80, open = {} })
assert(out.lines[1] == '## You · AI! lua/a.lua:42' and out.lines[2] == 'Refactor' and out.lines[3] == '')
assert(out.lines[4] == '## Pi · claude-opus-5-5' and out.lines[7] == '## Pi · restored')
assert(has_mark(out, 0, 'line_hl_group', 'AIBandUser') and has_mark(out, 3, 'line_hl_group', 'AIBandAssistant'))
assert(has_mark(out, 6, 'line_hl_group', 'AIBandRestored'))
assert(has_mark(out, 0, 'virt_text_pos', 'overlay') and has_mark(out, 0, 'virt_text_pos', 'right_align'))
assert(not has_mark(out, 6, 'virt_text_pos', 'right_align'), 'restored entry without time shows no time')
local inline = false
for _, m in ipairs(out.marks) do
  if m[1] == 0 and m[2] == 3 and m[3].virt_text_pos == 'inline' then inline = true end
  if m[1] == 0 and m[3].virt_text_pos == 'overlay' then
    assert(m[3].virt_text[1][1] == require('ai.ui.highlights').icons().band .. ' ')
  end
end
assert(inline, 'icon is inline text at col 3')
-- streaming header
out = t.render({}, { width = 80, open = {}, stream = 'partial', stream_model = 'gpt-6-luna-2026-09-22' })
assert(out.lines[1] == '## Pi · gpt-6-luna · responding ⋯' and out.lines[2] == 'partial')
-- fence_autoclose
out = t.render({ t.message({ role = 'assistant', text = '```lua\nlocal x' }), t.event('info', 'Settled: x') }, { width = 80, open = {} })
assert(out.lines[4] == '```', 'unbalanced fence closed before the next entry')
assert(has_mark(out, 2, 'line_hl_group', 'AICode'))
-- tool badges: classes, states, in-place mutation keeps one line
local tool = t.tool({ call_id = 'a', name = 'edit', detail = 'lua/a.lua', state = 'running', started = 0 })
out = t.render({ tool }, { width = 80, open = {} })
assert(#out.lines == 1 and out.lines[1] == '  [edit] lua/a.lua')
assert(has_mark(out, 0, 'hl_group', 'AIToolWrite'))
tool.state, tool.elapsed = 'done', 0.4
out = t.render({ tool }, { width = 80, open = {} })
assert(#out.lines == 1)
local ok_chunk = false
for _, m in ipairs(out.marks) do
  if m[3].virt_text and m[3].virt_text[1][1]:find('✓ 0.4s', 1, true) and m[3].virt_text[1][2] == 'AIToolOk' then ok_chunk = true end
end
assert(ok_chunk)
assert(has_mark(t.render({ t.tool({ call_id = 'b', name = 'bash', state = 'failed', started = 0, elapsed = 1.2 }) }, { width = 80, open = {} }), 0, 'hl_group', 'AIToolExec'))
-- event groups
local e1, e2, e3 = t.event('info', 'Connected'), t.event('info', 'queued'), t.event('info', 'Settled: x')
local warn, e4 = t.event('warn', 'Assistant stopped: length'), t.event('info', 'Stopping')
out = t.render({ e1, e2, e3, warn, e4 }, { width = 80, open = {} })
assert(out.lines[1] == '▸ 3 events · Settled: x' and #out.groups == 1 and out.groups[1].key == e1.uid and out.groups[1].row == 0)
assert(out.lines[2]:find('Assistant stopped: length', 1, true) and has_mark(out, 1, 'hl_group', 'AIEventWarn'))
assert(out.lines[3] == '· Stopping', 'single-event group renders inline')
out = t.render({ e1, e2, e3 }, { width = 80, open = { [e1.uid] = true } })
assert(out.lines[1] == '▾ 3 events' and out.lines[2] == '· Connected' and out.lines[4] == '· Settled: x')
local multi = t.event('info', 'a\nb')
out = t.render({ multi }, { width = 80, open = {} })
assert(#out.lines == 2 and out.lines[1] == '· a' and out.lines[2] == '  b' and t.height(multi) == 2)
-- blank line between a tool/event run and a following message
out = t.render({ e4, t.message({ role = 'user', text = 'hi' }) }, { width = 80, open = {} })
assert(out.lines[2] == '' and out.lines[3]:match('^## You'))
-- header_truncation
local long = t.message({ role = 'user', text = 'x', label = string.rep('long/path/', 10) .. 'file.lua:1' })
out = t.render({ long }, { width = 20, open = {} })
assert(vim.fn.strdisplaywidth(out.lines[1]) <= 20 - 6 and out.lines[1]:find('…', 1, true))
-- height
assert(t.height(user) == 3 and t.height(e1) == 1)
-- highlights_reapplied
vim.cmd('highlight clear')
vim.api.nvim_exec_autocmds('ColorScheme', {})
assert(next(vim.api.nvim_get_hl(0, { name = 'AIBandUser' })) ~= nil)
print('AI timeline tests passed')
