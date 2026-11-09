-- Compact tool progress without processes/providers.
vim.opt.rtp:append(vim.fn.getcwd())
local tools = require('ai.ui.tools')
local session = {}
local function has(text, expected) assert(text:find(expected, 1, true), text) end
has(tools.start(session, { toolName = 'bash', toolCallId = 'a', args = { command = 'rg -n TODO\n lua' } }),
  'Tool: bash: rg -n TODO lua [running]')
has(tools.start(session, { toolName = 'bash', toolCallId = 'b', args = { command = 'npm test' } }), 'npm test')
local finished = tools.finish(session, { toolName = 'bash', toolCallId = 'a' })
has(finished, 'rg -n TODO lua [done]')
assert(finished:match('%(%d+%.%ds%)'))
has(tools.finish(session, { toolName = 'bash', toolCallId = 'b', isError = true }), 'npm test [failed]')
assert(next(session.tools) == nil)
has(tools.start(session, { toolName = 'read', args = { path = 'lua/init.lua', offset = 20 } }),
  'read: lua/init.lua (line 20)')
has(tools.start(session, { toolName = 'grep', args = { pattern = 'TODO', path = 'lua' } }), 'grep: TODO in lua')
has(tools.start(session, { toolName = 'web_search', args = { query = 'Neovim RPC' } }), 'web_search: Neovim RPC')
has(tools.finish({}, { toolName = 'edit' }), 'Tool: edit [done]')
local edit = tools.start(session, { toolName = 'edit', args = { path = 'a.lua', oldText = 'SECRET', newText = 'SECRET' } })
assert(not edit:find('SECRET', 1, true))
local long = tools.start(session, { toolName = 'bash', args = { command = string.rep('界', 200) } })
assert(vim.fn.strchars(long) < 170)
has(long, '…')
assert(pcall(tools.start, session, { toolName = 'custom', args = vim.NIL }))
print('AI tool progress tests passed')
