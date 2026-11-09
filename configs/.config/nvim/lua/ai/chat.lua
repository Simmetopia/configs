-- General web-chat workflow. It shares transport/UI, never the comment tool loadout.
local roots = require('ai.project')
local sessions = require('ai.session')
local protocol = require('ai.protocol')
local view = require('ai.ui.view')
local tools = require('ai.ui.tools')
local profiles = require('ai.profiles')
local M = {}
local chats = {}
local dispatch, start

local function render(c) view.render(c.view) end
local function owns(c) return profiles.allows(c.token) end
local function same_token(left, right)
  return type(left) == 'table' and type(right) == 'table'
    and left.name == right.name and left.generation == right.generation
end

local function submit(c, text)
  if not owns(c) then return false end
  c.queue[#c.queue + 1] = { message = text }
  dispatch(c, c.token)
  render(c)
end

local function chat()
  local profile = profiles.current()
  local root = roots.chat_root()
  local key = profile.name .. '\n' .. root
  local c = chats[key]
  if c then
    c.token = profiles.token()
    view.set_submit(c.view, function(text) return submit(c, text) end)
    return c
  end
  c = { root = root, profile = profile, token = profiles.token(), queue = {}, stopped = false, busy = false }
  c.view = view.new(root, 'Pi web chat (' .. profile.name .. ')', 'i prompt · za fold · ^L clear · q hide',
    function()
      local status = c.new_pending and 'Starting new chat' or c.busy and 'Busy' or c.stopped and 'Stopped (:AIChatRestart)'
        or c.session and not c.session.ready and 'Connecting' or 'Ready'
      return status .. ' | queued: ' .. #c.queue
    end,
    function() return c.session and c.session.stream or '' end,
    function(text) return submit(c, text) end, profile.name .. ':chat',
    function() return c.session and c.session.model and c.session.model.id end)
  chats[key] = c
  return c
end

local function finish(c, session, token, request)
  if not c.busy or c.session ~= session or c.active_request ~= request or not profiles.allows(token) then return end
  c.busy, c.accepted, c.settled, c.active_request = false, false, false, nil
  session.stream, session.blocks = '', {}
  render(c)
  local next_item = c.queue[1]
  vim.schedule(function()
    if profiles.allows(token) and same_token(c.token, token) and c.queue[1] == next_item then
      dispatch(c, token, next_item, true)
    end
  end)
end

local function record(c, session, event, token)
  local request = c.active_request
  if not profiles.allows(token) or c.session ~= session or not request
    or request.session ~= session or request.token ~= token then return end
  if event.type == 'message_start' and event.message and event.message.role == 'assistant' then
    session.stream, session.blocks = '', {}
  elseif event.type == 'message_update' then
    protocol.update(session, event.assistantMessageEvent or {})
  elseif event.type == 'message_end' and event.message and event.message.role == 'assistant' then
    local text = protocol.text(event.message)
    if text ~= '' then view.message(c.view, 'assistant', protocol.clip(text, require('ai.config').options.limits.response_bytes),
      { model = session.model and session.model.id }) end
    if event.message.stopReason == 'error' then view.event(c.view, 'error', 'Model error: check provider credentials.') end
    session.stream, session.blocks = '', {}
  elseif event.type == 'tool_execution_start' then
    view.add(c.view, tools.start(session, event))
  elseif event.type == 'tool_execution_end' then
    view.add(c.view, tools.finish(session, event))
  elseif event.type == 'agent_settled' and c.busy and c.active_request and c.active_request.session == session then
    local request = c.active_request
    c.settled = true
    if c.accepted then finish(c, session, token, request) end
  elseif event.type == 'response' and event.success == false then
    view.event(c.view, 'error', 'Unmatched Pi command/parse error')
  elseif event.type == 'extension_ui_request' and vim.tbl_contains({ 'select', 'confirm', 'input', 'editor' }, event.method) then
    sessions.send(session, { type = 'extension_ui_response', id = event.id, cancelled = true })
    view.event(c.view, 'warn', 'Pi extension dialog cancelled (unsupported in this UI).')
  end
  render(c)
end

start = function(c)
  if c.session or c.stopped or not owns(c) then return end
  local token = profiles.token()
  if not profiles.allows(token) then return end
  local session
  local function owns_session(value)
    return value and value == c.session and profiles.allows(token)
  end
  local err
  session, err = sessions.start(c.root, 'chat', 'chat', {
    on_event = function(s, event) record(c, s, event, token) end,
    on_diagnostic = function(text) if session and owns_session(session) then view.event(c.view, 'warn', text); render(c) end end,
    on_error = function(s, text)
      if not owns_session(s) then return end
      c.stopped, c.busy, c.active_request = true, false, nil
      view.event(c.view, 'error', text)
      render(c)
    end,
    on_exit = function(s, code, stopping)
      local current_slot = c.session == s
      if current_slot then c.session, c.session_token = nil, nil end
      if current_slot and c.retiring then c.retiring, c.stopped = false, false end
      if current_slot and profiles.allows(token) and not stopping then
        c.stopped = true
        view.event(c.view, 'error', 'Pi exited (' .. code .. '); use :AIChatRestart')
      end
      if current_slot and profiles.allows(token) and c.new_pending then
        c.new_pending, c.stopped = false, false
        start(c)
      end
      if current_slot and profiles.allows(token) then render(c) end
    end,
    on_ready = function(s, history)
      if not owns_session(s) then return end
      for _, message in ipairs(history) do
        if message.role == 'user' or message.role == 'assistant' then
          local text = protocol.text(message)
          if text ~= '' then view.message(c.view, message.role,
            protocol.clip(text, require('ai.config').options.limits.restored_bytes),
            { restored = true, model = s.model and s.model.id }) end
        end
      end
      render(c)
      dispatch(c, token)
    end,
  })
  if not session then if profiles.allows(token) then c.stopped = true; view.event(c.view, 'error', err); render(c) end; return end
  c.session, c.session_token = session, token
  render(c)
end

dispatch = function(c, token, expected_head, strict_head)
  token = token or c.token
  if not profiles.allows(token) or not same_token(c.token, token) or c.stopped or c.busy then return end
  if strict_head and c.queue[1] ~= expected_head then return end
  if #c.queue == 0 then return end
  if not c.session or not profiles.allows(c.session_token) or not c.session.ready then start(c); return end
  local session, token = c.session, c.session_token
  local function owns_session() return c.session == session and profiles.allows(token) end
  local item = table.remove(c.queue, 1)
  local message = item.message
  local request = { session = session, token = token, message = message, item = item }
  c.active_request = request
  c.busy, c.accepted, c.settled = true, false, false
  view.message(c.view, 'user', message)
  if not sessions.send(session, { type = 'prompt', message = message }, function(response)
    if not owns_session() or c.active_request ~= request then return end
    if not response.success or response.data and response.data.disposition == 'handled' then
      view.event(c.view, 'error', 'Prompt rejected'); finish(c, session, token, request); return
    end
    c.accepted = true
    if c.settled then finish(c, session, token, request) end
  end) then
    if owns_session() and c.active_request == request then view.event(c.view, 'error', 'RPC write failed'); finish(c, session, token, request) end
  end
  render(c)
end

function M.toggle()
  if not profiles.allows(profiles.token()) then return vim.notify('AI: Profile transition is locked; retry after switching or recovery.', vim.log.levels.WARN) end
  local c = chat()
  if view.toggle(c.view) then start(c) end
end

function M.clear()
  if not profiles.allows(profiles.token()) then return vim.notify('AI: Profile transition is locked; retry after switching or recovery.', vim.log.levels.WARN) end
  view.clear(chat().view)
end

function M.new()
  if not profiles.allows(profiles.token()) then return vim.notify('AI: Profile transition is locked; retry after switching or recovery.', vim.log.levels.WARN) end
  local c = chat()
  if c.new_pending or c.busy or #c.queue > 0 or c.session and
      (not c.session.ready or c.session.client.stopping) then
    return vim.notify('AI: Finish pending work or use :AIChatStop and wait for exit before :AIChatNew.', vim.log.levels.WARN)
  end
  local identity, identity_err = sessions.identity(c.root, 'chat', 'chat', c.profile)
  if not identity then return vim.notify('AI: ' .. identity_err, vim.log.levels.ERROR) end
  local id, err = require('ai.session_ids').fresh(identity)
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

local function stop_chat(c)
  c.stopped, c.busy, c.queue, c.new_pending, c.active_request = true, false, {}, false, nil
  sessions.stop(c.session)
  render(c)
end

function M.stop()
  if not profiles.allows(profiles.token()) then return vim.notify('AI: Profile transition is locked; retry after switching or recovery.', vim.log.levels.WARN) end
  stop_chat(chat())
end

function M.stop_all()
  for _, c in pairs(chats) do
    stop_chat(c)
    view.hide(c.view)
  end
end

function M.busy_reason()
  for _, c in pairs(chats) do
    if c.busy or #c.queue > 0 or c.new_pending then return 'web chat has active or queued work' end
    if c.session and (not c.session.ready or c.session.client.stopping) then return 'web chat is connecting or exiting' end
  end
end

function M.retire()
  for _, c in pairs(chats) do
    if c.session then c.stopped, c.retiring = true, true; sessions.stop(c.session) else c.stopped = false end
    view.hide(c.view)
  end
end

function M.restart()
  if not profiles.allows(profiles.token()) then return vim.notify('AI: Profile transition is locked; retry after switching or recovery.', vim.log.levels.WARN) end
  local c = chat()
  if c.session then return vim.notify('AI: Wait for the chat process to exit first', vim.log.levels.WARN) end
  c.stopped = false
  start(c)
end

M._chats = chats

return M
