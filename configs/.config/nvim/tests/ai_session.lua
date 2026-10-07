-- Run: PATH="$PWD/tests/bin:$PATH" nvim --headless -u NONE -l tests/ai_session.lua
vim.opt.rtp:append(vim.fn.getcwd())
local config = require('ai.config')
config.setup({ limits = { startup_ms = 10000, shutdown_ms = 100 } })
local session = require('ai.session')
local protocol = require('ai.protocol')
local root = vim.fn.getcwd()
local function wait_for(fn) assert(vim.wait(15000, fn, 10), 'session test timed out') end

local hash = vim.fn.sha256(root .. ':edit:luna')
assert(session.id(root, 'edit', 'luna') == hash:sub(1, 8) .. '-' .. hash:sub(9, 12) .. '-4' .. hash:sub(14, 16) .. '-8' .. hash:sub(18, 20) .. '-' .. hash:sub(21, 32))
assert(session.id(root, 'chat', 'luna') == 'chat-' .. vim.fn.sha256(root .. ':web-chat'):sub(1, 32))
assert(protocol.text({ content = 'string message' }) == 'string message')
assert(protocol.text({ content = { { type = 'thinking', thinking = 'hidden' }, { type = 'text', text = 'answer' } } }) == 'answer')
local stream = {}
protocol.update(stream, { type = 'text_delta', contentIndex = 2, delta = 'second' })
protocol.update(stream, { type = 'text_delta', contentIndex = 0, delta = 'first ' })
protocol.update(stream, { type = 'text_end', contentIndex = 2, content = 'last' })
assert(stream.stream == 'first last')
local count, errors = 0, 0
protocol.feed({ pending = '' }, string.rep('x', config.options.limits.record_bytes + 1) .. '\n',
  function() count = count + 1 end, function() errors = errors + 1 end)
assert(count == 0 and errors == 1)

for _, behavior in ipairs({ 'mismatch', 'timeout', 'history' }) do
  vim.env.AI_TEST_BEHAVIOR = behavior
  config.options.limits.startup_ms = behavior == 'timeout' and 100 or 10000
  local ready, exited, failure, history = false, false, nil, nil
  local s = assert(session.start(root, 'chat', 'luna', {
    on_event = function() end, on_diagnostic = function() end,
    on_error = function(_, message) failure = message end,
    on_exit = function() exited = true end,
    on_ready = function(_, messages) ready, history = true, messages end,
  }))
  if behavior == 'history' then
    wait_for(function() return ready end)
    assert(protocol.text(history[1]) == 'Restored string history')
    assert(not failure)
    session.stop(s)
  else
    wait_for(function() return failure ~= nil end)
    assert(not ready)
    assert(failure:find(behavior == 'mismatch' and 'mismatched' or 'timed out', 1, true), failure)
  end
  wait_for(function() return exited end)
end
vim.env.AI_TEST_BEHAVIOR = nil
-- Setup is idempotent, and both workflows register under one entry point.
require('ai').setup({ comments = { enabled = false } })
require('ai').setup()
assert(vim.fn.exists(':AIToggle') == 2 and vim.fn.exists(':AIChat') == 2)
print('AI session tests passed')
