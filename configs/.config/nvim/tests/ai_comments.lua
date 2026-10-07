-- Run: AI_TEST_LOG=/tmp/ai-comments-test.log PATH="$PWD/tests/bin:$PATH" nvim --headless -u NONE -l tests/ai_comments.lua
vim.opt.rtp:append(vim.fn.getcwd())
local core = require('ai.comments.markers')
local scanner = require('ai.comments.scanner')
local function eq(a, b) assert(vim.deep_equal(a, b), vim.inspect({ expected = b, actual = a })) end
local function wait_for(fn)
  assert(vim.wait(6000, fn, 20), 'timed out waiting for RPC event')
end
local function log()
  if vim.fn.filereadable(vim.env.AI_TEST_LOG) == 0 then return {} end
  local records = {}
  for _, line in ipairs(vim.fn.readfile(vim.env.AI_TEST_LOG)) do
    records[#records + 1] = vim.json.decode(line)
  end
  return records
end
local function file(name, text)
  local path = vim.fn.getcwd() .. '/' .. name
  vim.fn.writefile(vim.split(text, '\n', { plain = true }), path)
  vim.cmd.edit(path)
  vim.bo.filetype = 'python'
  return vim.api.nvim_get_current_buf(), path
end
local function save(text)
  local buf = vim.api.nvim_get_current_buf()
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, vim.split(text, '\n', { plain = true }))
  vim.cmd.write()
end

eq(core.parse('value = 1  # fix null AI!', 'python').instruction, 'fix null')
eq(core.parse(' // AI? why?', 'javascript').kind, '?')
eq(core.parse(' // AI?? why?', 'javascript').kind, '??')
eq(core.parse('x = 1 # AI!! fix it', 'python').kind, '!!')
eq(core.parse('; examine AI??', 'lisp').kind, '??')
eq(core.parse('-- aI!! change', 'lua').kind, '!!')
eq(core.parse('# AI!!! invalid', 'python'), nil)
eq(core.parse('# AI!? invalid', 'python'), nil)
eq(core.parse('-- Ai. extra context', 'lua').kind, '.')
eq(core.parse('; check AI?', 'lisp').instruction, 'check')
eq(core.parse('OpenAI is not a marker # hello', 'python'), nil)
eq(core.parse('# AI! one', 'python').kind, '!')
eq(core.parse('name = "OpenAI!"', 'python'), nil)
eq(core.parse('name = " # AI! no"', 'python'), nil)
eq(core.parse_comment('// note // AI! buried', 'typescript'), nil)
eq(core.scan({ '# AI. context', '# AI! do work' }, 'python')[1].context, 'context')
local ts_lines = {
  'local text = [[ -- AI! not a comment ]]',
  '-- AI. nearby context',
  'local value = 1-- AI!! real comment',
  '--[[ AI? block comments are not line comments ]]',
}
local ts_buf = vim.api.nvim_create_buf(false, true)
vim.bo[ts_buf].filetype = 'lua'
vim.api.nvim_buf_set_lines(ts_buf, 0, -1, false, ts_lines)
local ts_markers, ts_source = scanner.scan(ts_buf, ts_lines, 'lua')
eq(ts_source, 'treesitter')
eq(#ts_markers, 1)
eq(ts_markers[1].instruction, 'real comment')
eq(ts_markers[1].kind, '!!')
eq(ts_markers[1].number, 3)
eq(ts_markers[1].context, 'nearby context')
eq(core.cleanup_line(ts_lines, ts_markers[1])[3], 'local value = 1')
eq(core.scan(ts_lines, 'lua')[1].instruction, 'not a comment ]]')
local get_parser = vim.treesitter.get_parser
vim.treesitter.get_parser = function() error('parser unavailable') end
local fallback, source = scanner.scan(ts_buf, ts_lines, 'lua')
vim.treesitter.get_parser = get_parser
eq(source, 'fallback')
eq(#fallback, #core.scan(ts_lines, 'lua'))
eq(fallback[1].instruction, 'not a comment ]]')
vim.api.nvim_buf_delete(ts_buf, { force = true })
if vim.treesitter.language.add('typescript') then
  local typescript_lines = { 'const url = "// AI! fake"', '/* AI? ignored */', 'const value = 1// AI?? actual question' }
  local typescript_buf = vim.api.nvim_create_buf(false, true)
  vim.bo[typescript_buf].filetype = 'typescript'
  vim.api.nvim_buf_set_lines(typescript_buf, 0, -1, false, typescript_lines)
  local typescript_markers, typescript_source = scanner.scan(typescript_buf, typescript_lines, 'typescript')
  eq(typescript_source, 'treesitter')
  eq(#typescript_markers, 1)
  eq(typescript_markers[1].kind, '??')
  eq(typescript_markers[1].number, 3)
  eq(core.cleanup_line(typescript_lines, typescript_markers[1])[3], 'const value = 1')
  vim.api.nvim_buf_delete(typescript_buf, { force = true })
end
eq(core.cleanup_line({ 'x = 1 # fix AI!' }, { number = 1, line = 'x = 1 # fix AI!', comment_at = 7 }), { 'x = 1' })
eq(core.cleanup_line({ 'changed' }, { number = 1, line = 'old', comment_at = 1 }), nil)
local parser, records, errors = { pending = '' }, {}, 0
local function feed(chunk)
  require('ai.protocol').feed(parser, chunk, function(r) records[#records + 1] = r end, function() errors = errors + 1 end)
end
feed('{"id":1}\r\nnot-json\n{"msg":"a')
feed('\\u2028b"}\n')
eq(#records, 2)
eq(errors, 1)
eq(records[2].msg, 'a\u{2028}b')
local queue, seen = {}, {}
assert(core.enqueue(queue, seen, { key = 'a' }))
assert(not core.enqueue(queue, seen, { key = 'a' }))
assert(core.enqueue(queue, seen, { key = 'b' }))
eq(core.pop(queue).key, 'a')
eq(core.pop(queue).key, 'b')

require('ai').setup()
assert(vim.fn.maparg('<leader>aip', 'n') ~= '') -- config sets leader to space in normal use
vim.fn.delete(vim.env.AI_TEST_LOG)
local buf, path = file('ai_comments_test_' .. vim.uv.hrtime() .. '.py', '# first AI!')
save('# first AI!')
wait_for(function() return #log() == 1 end)
save('# first AI!')
save('# changed AI!')
save('x = 1 # question AI?')
wait_for(function() return #log() == 3 end)
eq(log()[1].mode, 'edit')
eq(log()[2].mode, 'edit')
eq(log()[3].mode, 'question')
eq(log()[1].model, 'gpt-6-luna-2026-09-22')
eq(log()[3].model, 'gpt-6-luna-2026-09-22')
assert(log()[1].session_id ~= log()[3].session_id)
wait_for(function() return vim.fn.readfile(path)[1] == 'x = 1 # question AI?' or vim.fn.readfile(path)[1] == 'x = 1' end)
vim.cmd.AIToggle()
local win = vim.api.nvim_get_current_win()
vim.cmd.AIToggle()
assert(not vim.api.nvim_win_is_valid(win))
vim.cmd.AIToggle()
assert(vim.api.nvim_win_is_valid(vim.api.nvim_get_current_win()))
vim.cmd.AIToggle()
wait_for(function() return vim.fn.readfile(path)[1] == 'x = 1' end)
save('# agent-edits AI!')
wait_for(function() return #log() == 4 end)
wait_for(function() return table.concat(vim.fn.readfile(path), '\n'):find('changed by agent', 1, true) ~= nil end)
wait_for(function() return not table.concat(vim.fn.readfile(path), '\n'):find('agent-edits', 1, true) end)
save('# conflict AI!')
wait_for(function() return #log() == 5 end)
vim.api.nvim_buf_set_lines(buf, 0, -1, false, { '# unsaved user edit' })
wait_for(function() return vim.fn.readfile(path)[1] == '# conflict AI!' end)
vim.wait(450)
eq(vim.api.nvim_buf_get_lines(buf, 0, 1, false)[1], '# unsaved user edit')
eq(vim.fn.readfile(path)[1], '# conflict AI!')
vim.cmd.AIStop()
vim.wait(150)
vim.cmd.AIRestart()
vim.wait(150)
vim.cmd.edit({ bang = true })
save('# process-exits AI!')
wait_for(function() return #log() == 6 end)
vim.wait(450)
-- Restart requires all tier sessions to exit, including the default Opus session.
vim.cmd.AIStop()
vim.wait(150)
vim.cmd.AIRestart()
vim.wait(150)
vim.cmd.AIToggle()
local conversation = vim.api.nvim_get_current_buf()
for _, map in ipairs(vim.api.nvim_buf_get_keymap(conversation, 'n')) do
  if map.lhs == 'i' then map.callback(); break end
end
local input = vim.api.nvim_get_current_buf()
vim.api.nvim_buf_set_lines(input, 0, -1, false, { 'ordinary prompt from float' })
for _, map in ipairs(vim.api.nvim_buf_get_keymap(input, 'i')) do
  if map.lhs == '<CR>' then map.callback(); break end
end
wait_for(function() return #log() == 7 end)
eq(log()[7].message, 'ordinary prompt from float')
eq(log()[7].mode, 'edit')
eq(log()[7].provider, 'lego-anthropic')
eq(log()[7].model, 'eu.anthropic.claude-opus-5-5')
eq(log()[7].thinking, 'medium')
assert(log()[7].session_id ~= log()[6].session_id)
vim.wait(350)
vim.cmd.AIToggle()
save('# complex edit AI!!')
save('value = 1 # detailed question AI??')
wait_for(function() return #log() == 9 end)
eq(log()[8].mode, 'edit')
eq(log()[8].provider, 'lego-anthropic')
eq(log()[8].model, 'eu.anthropic.claude-opus-5-5')
eq(log()[8].thinking, 'medium')
eq(log()[8].session_id, log()[7].session_id)
eq(log()[9].mode, 'question')
eq(log()[9].model, 'eu.anthropic.claude-opus-5-5')
eq(log()[9].thinking, 'medium')
assert(log()[8].session_id ~= log()[9].session_id)
assert(log()[8].session_id ~= log()[1].session_id)
assert(log()[9].session_id ~= log()[3].session_id)
wait_for(function() return vim.fn.readfile(path)[1] == 'value = 1' end)
local scratch = vim.api.nvim_create_buf(false, true)
vim.bo[scratch].buftype = 'nofile'
vim.api.nvim_buf_set_lines(scratch, 0, -1, false, { '# ignored AI!' })
vim.api.nvim_exec_autocmds('BufWritePost', { buffer = scratch })
local outside = vim.fn.tempname() .. '.py'
vim.fn.writefile({ '# ignored outside AI!' }, outside)
vim.cmd.edit(outside)
vim.bo.filetype = 'python'
vim.cmd.write()
vim.wait(100)
eq(#log(), 9)
vim.api.nvim_buf_delete(vim.api.nvim_get_current_buf(), { force = true })
vim.fn.delete(outside)
vim.api.nvim_buf_delete(scratch, { force = true })
local lua_buf, lua_path = file('ai_comments_test_' .. vim.uv.hrtime() .. '.lua', 'local text = [[ -- AI! fake ]]')
vim.bo.filetype = 'lua'
save('local text = [[ -- AI! fake ]]')
vim.wait(100)
eq(#log(), 9)
save('local value = 1-- AI! real')
wait_for(function() return #log() == 10 end)
eq(log()[10].model, 'gpt-6-luna-2026-09-22')
wait_for(function() return vim.fn.readfile(lua_path)[1] == 'local value = 1' end)
save('local value = 1 -- unrecovered-tool AI!')
wait_for(function() return #log() == 11 end)
vim.wait(350)
eq(vim.fn.readfile(lua_path)[1], 'local value = 1 -- unrecovered-tool AI!')
save('local value = 1 -- unrecovered-tool AI!')
wait_for(function() return #log() == 12 end)
vim.wait(350)
eq(vim.fn.readfile(lua_path)[1], 'local value = 1 -- unrecovered-tool AI!')
assert(vim.fn.maparg('<leader>aip', 'n') ~= '')
vim.cmd.AIStop()
vim.api.nvim_buf_delete(lua_buf, { force = true })
vim.fn.delete(lua_path)
vim.api.nvim_buf_delete(buf, { force = true })
vim.fn.delete(path)
vim.fn.delete(vim.env.AI_TEST_LOG)
print('AI comments tests passed')
