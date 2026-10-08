-- General web-chat workflow. It shares transport/UI, never the comment tool loadout.
local roots = require('ai.project')
local sessions = require('ai.session')
local protocol = require('ai.protocol')
local view = require('ai.ui.view')
local M = {}
local chats = {}
local dispatch, start

local function render(c) view.render(c.view) end
local function append(c, text) view.append(c.view, text) end

local function chat()
  local root = roots.chat_root()
  if chats[root] then return chats[root] end
  local c = { root = root, queue = {}, stopped = false, busy = false }
  c.view = view.new(root, 'Pi web chat', 'i: prompt  Ctrl-L: clear  q: hide  :AIChatNew / :AIChatStop / :AIChatRestart',
    function()
      local status = c.new_pending and 'Starting new chat' or c.busy and 'Busy' or c.stopped and 'Stopped (:AIChatRestart)'
        or c.session and not c.session.ready and 'Connecting' or 'Ready'
      return status .. ' | queued: ' .. #c.queue
    end,
    function() return c.session and c.session.stream or '' end,
    function(text)
      if c.new_pending then return false end
      c.queue[#c.queue + 1] = text; dispatch(c); render(c)
    end)
  chats[root] = c
  return c
end

local function finish(c)
  if not c.busy then return end
  c.busy, c.accepted, c.settled = false, false, false
  if c.session then c.session.stream, c.session.blocks = '', {} end
  render(c)
  vim.schedule(function() dispatch(c) end)
end

local function record(c, session, event)
  if event.type == 'message_start' and event.message and event.message.role == 'assistant' then
    session.stream, session.blocks = '', {}
  elseif event.type == 'message_update' then
    protocol.update(session, event.assistantMessageEvent or {})
  elseif event.type == 'message_end' and event.message and event.message.role == 'assistant' then
    local text = protocol.text(event.message)
    if text ~= '' then view.message(c.view, 'Pi', protocol.clip(text, require('ai.config').options.limits.response_bytes)) end
    if event.message.stopReason == 'error' then append(c, 'Model error: check provider credentials.') end
    session.stream, session.blocks = '', {}
  elseif event.type == 'tool_execution_end' then
    append(c, (event.toolName or 'Tool') .. (event.isError and ' failed (check provider search support or URL)' or ' done'))
  elseif event.type == 'agent_settled' and c.busy then
    c.settled = true
    if c.accepted then finish(c) end
  elseif event.type == 'response' and event.success == false then
    append(c, 'Unmatched Pi command/parse error')
  elseif event.type == 'extension_ui_request' and vim.tbl_contains({ 'select', 'confirm', 'input', 'editor' }, event.method) then
    sessions.send(session, { type = 'extension_ui_response', id = event.id, cancelled = true })
    append(c, 'Pi extension dialog cancelled (unsupported in this UI).')
  end
  render(c)
end

start = function(c)
  if c.session or c.stopped then return end
  local session, err = sessions.start(c.root, 'chat', require('ai.config').options.chat.tier, {
    on_event = function(s, event) record(c, s, event) end,
    on_diagnostic = function(text) append(c, text); render(c) end,
    on_error = function(_, text) c.stopped = true; c.busy = false; append(c, text); render(c) end,
    on_exit = function(_, code, stopping)
      c.session, c.busy = nil, false
      if not stopping then c.stopped = true; append(c, 'Pi exited (' .. code .. '); use :AIChatRestart') end
      if c.new_pending then
        c.new_pending, c.stopped = false, false
        start(c)
      end
      render(c)
    end,
    on_ready = function(_, history)
      for _, message in ipairs(history) do
        if message.role == 'user' or message.role == 'assistant' then
          local text = protocol.text(message)
          if text ~= '' then view.message(c.view, message.role == 'user' and 'You' or 'Pi',
            protocol.clip(text, require('ai.config').options.limits.restored_bytes)) end
        end
      end
      render(c)
      dispatch(c)
    end,
  })
  if not session then c.stopped = true; append(c, err); render(c); return end
  c.session = session
  render(c)
end

dispatch = function(c)
  if c.stopped or c.busy or #c.queue == 0 then return end
  if not c.session or not c.session.ready then start(c); return end
  local message = table.remove(c.queue, 1)
  c.busy, c.accepted, c.settled = true, false, false
  view.message(c.view, 'You', message)
  if not sessions.send(c.session, { type = 'prompt', message = message }, function(response)
    if not response.success or response.data and response.data.disposition == 'handled' then
      append(c, 'Prompt rejected'); finish(c); return
    end
    c.accepted = true
    if c.settled then finish(c) end
  end) then append(c, 'RPC write failed'); finish(c) end
  render(c)
end

function M.toggle()
  local c = chat()
  if view.toggle(c.view) then start(c) end
end

function M.clear()
  view.clear(chat().view)
end

function M.new()
  local c = chat()
  if c.new_pending or c.busy or #c.queue > 0 or c.session and
      (not c.session.ready or c.session.client.stopping) then
    return vim.notify('AI: Finish pending work or use :AIChatStop and wait for exit before :AIChatNew.', vim.log.levels.WARN)
  end
  local id, err = require('ai.session_ids').fresh(c.root, 'chat', require('ai.config').options.chat.tier)
  if not id then return vim.notify('AI: ' .. err, vim.log.levels.ERROR) end
  view.reset(c.view)
  if c.session then
    c.new_pending, c.stopped = true, true
    sessions.stop(c.session)
  else
    c.stopped = false
    start(c)
  end
  render(c)
end

function M.stop()
  local c = chat()
  c.stopped, c.busy, c.queue, c.new_pending = true, false, {}, false
  sessions.stop(c.session)
  render(c)
end

function M.restart()
  local c = chat()
  if c.session then return vim.notify('AI: Wait for the chat process to exit first', vim.log.levels.WARN) end
  c.stopped = false
  start(c)
end

return M
