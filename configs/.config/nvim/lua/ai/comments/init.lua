-- Saved-comment workflow: one FIFO per project, four isolated Pi sessions.
local markers = require('ai.comments.markers')
local scanner = require('ai.comments.scanner')
local storage = require('ai.comments.storage')
local files = require('ai.comments.files')
local roots = require('ai.project')
local sessions = require('ai.session')
local protocol = require('ai.protocol')
local view = require('ai.ui.view')
local M = {}
local projects = {}
local selected
local serial = 0
local dispatch, finish, enqueue_prompt

local function notify(text, level)
  vim.notify('AI: ' .. text, level or vim.log.levels.INFO)
end

local function project(root)
  if projects[root] then return projects[root] end
  local handled = storage.load(root)
  local p = { root = root, sessions = {}, queue = {}, handled = handled, seen = vim.deepcopy(handled), paused = false }
  p.view = view.new(root, 'Pi project',
    'i: prompt  q: hide  :AIStatus / :AIAbort / :AIStop / :AIRestart',
    function()
      local status = p.active and ('busy (' .. p.active.mode .. '/' .. p.active.tier .. ')')
        or (p.paused and 'stopped (restart required)' or 'idle')
      return 'Status: ' .. status .. ' | queued: ' .. #p.queue
    end,
    function() return p.active and p.active.session.stream or '' end,
    function(text) enqueue_prompt(p, text) end)
  projects[root] = p
  return p
end

local function current()
  selected = roots.current() or selected
  return selected and project(selected)
end

local function append(p, text) view.append(p.view, text) end
local function render(p) view.render(p.view) end

finish = function(p, session, success)
  local item = p.active
  if not item or item.session ~= session then return end
  p.active = nil
  session.stream, session.blocks = '', {}
  if success and not item.failed and not item.assistant_error and not next(item.tool_errors or {}) then
    append(p, 'Settled: ' .. item.label)
    storage.remember(p, item.key)
    files.cleanup(p, item)
  else
    append(p, 'Failed/aborted: ' .. item.label .. ' (marker retained)')
    p.seen[item.key] = nil
  end
  files.checktime(p)
  render(p)
  vim.schedule(function() dispatch(p) end)
end

local function record(p, session, event)
  local item = p.active and p.active.session == session and p.active
  if event.type == 'message_start' and event.message and event.message.role == 'assistant' then
    session.stream, session.blocks = '', {}
  elseif event.type == 'message_update' then
    protocol.update(session, event.assistantMessageEvent or {})
  elseif event.type == 'message_end' and event.message and event.message.role == 'assistant' then
    local text = protocol.text(event.message)
    if text ~= '' then view.message(p.view, 'Pi', protocol.clip(text, require('ai.config').options.limits.response_bytes)) end
    session.stream, session.blocks = '', {}
    local reason = event.message.stopReason
    if item and reason then
      item.assistant_error = reason ~= 'stop' and reason ~= 'toolUse'
      if item.assistant_error then append(p, 'Assistant stopped: ' .. reason) end
    end
  elseif event.type == 'tool_execution_start' then
    append(p, 'Tool: ' .. (event.toolName or '?') .. ' running')
  elseif event.type == 'tool_execution_end' then
    local name = event.toolName or '?'
    append(p, 'Tool: ' .. name .. (event.isError and ' failed' or ' done'))
    if item then
      item.tool_errors = item.tool_errors or {}
      item.tool_errors[name] = event.isError and true or nil
      if not event.isError and (name == 'edit' or name == 'write') then
        item.tool_errors.edit, item.tool_errors.write = nil, nil
      end
    end
    files.checktime(p)
  elseif event.type == 'agent_settled' and item then
    item.settled = true
    if item.accepted then finish(p, session, true) end
  elseif event.type == 'auto_retry_start' or event.type == 'compaction_start' then
    append(p, 'Pi: ' .. event.type)
  elseif event.type == 'extension_ui_request' then
    -- Decline unsupported dialogs instead of leaving an extension waiting forever.
    if vim.tbl_contains({ 'select', 'confirm', 'input', 'editor' }, event.method) then
      sessions.send(session, { type = 'extension_ui_response', id = event.id, cancelled = true })
      append(p, 'Pi extension dialog cancelled (unsupported in this UI).')
    end
  elseif event.type == 'response' and event.success == false then
    append(p, 'Unmatched Pi command/parse error')
    if item then item.failed = true end
  elseif event.type == 'extension_error' then
    append(p, 'Pi extension error (details withheld)')
    if item then item.failed = true end
  end
  render(p)
end

local function start(p, mode, tier)
  local key = mode .. ':' .. tier
  if p.sessions[key] then return p.sessions[key] end
  local session, err = sessions.start(p.root, mode, tier, {
    on_event = function(s, event) record(p, s, event) end,
    on_diagnostic = function(text) append(p, text); render(p) end,
    on_error = function(s, text)
      p.paused = true
      append(p, text)
      finish(p, s, false)
      render(p)
    end,
    on_exit = function(s, code, stopping)
      p.sessions[key] = nil
      if not stopping then
        p.paused = true
        append(p, 'Pi ' .. key .. ' exited (code ' .. code .. '); :AIRestart to reconnect.')
        finish(p, s, false)
        notify('Pi RPC exited; use :AIRestart.', vim.log.levels.ERROR)
      end
      render(p)
    end,
    on_ready = function(_, history)
      append(p, 'Connected: ' .. key .. ' (persisted project session)')
      for _, message in ipairs(history) do
        if message.role == 'assistant' then
          local text = protocol.text(message)
          if text ~= '' then view.message(p.view, 'Previous Pi', protocol.clip(text, require('ai.config').options.limits.restored_bytes)) end
        end
      end
      render(p)
      dispatch(p)
    end,
  })
  if not session then p.paused = true; append(p, err); render(p); return end
  p.sessions[key] = session
  return session
end

dispatch = function(p)
  if p.paused or p.active or #p.queue == 0 then render(p); return end
  local item = p.queue[1]
  local session = start(p, item.mode, item.tier)
  if not session or not session.ready then render(p); return end
  markers.pop(p.queue)
  item.session, p.active = session, item
  append(p, item.label .. ' [sent]')
  if not sessions.send(session, { type = 'prompt', message = item.prompt }, function(response)
    if not response.success or response.data and response.data.disposition == 'handled' then
      append(p, 'Prompt rejected/handled without a run')
      finish(p, session, false)
      return
    end
    if p.active == item then
      item.accepted = true
      if item.settled then finish(p, session, true) end
    end
  end) then finish(p, session, false) end
  render(p)
end

enqueue_prompt = function(p, text)
  serial = serial + 1
  local tier = require('ai.config').options.comments.prompt_tier
  local item = { key = 'manual-' .. serial, mode = 'edit', tier = tier,
    label = 'Prompt (' .. tier .. '): ' .. text:sub(1, 100), prompt = text }
  markers.enqueue(p.queue, p.seen, item)
  append(p, item.label .. ' [queued]')
  dispatch(p)
end

function M.saved(buf)
  local root, path = roots.for_buffer(buf)
  if not root or vim.bo[buf].modified then return end
  local match, lines = files.matches(path, buf)
  if not match then return end
  local p = project(root)
  for _, marker in ipairs(scanner.scan(buf, lines, vim.bo[buf].filetype)) do
    local mode = marker.kind:sub(1, 1) == '?' and 'question' or 'edit'
    local tier = #marker.kind == 2 and 'opus' or 'luna'
    local item = {
      key = vim.fn.sha256(markers.key(path, marker)), marker = marker, path = path, buf = buf, mode = mode, tier = tier,
      prompt = require('ai.prompts').comment(root, path, marker, lines, mode),
      label = path:sub(#root + 2) .. ':' .. marker.number .. ' AI' .. marker.kind .. ' [' .. tier .. '] ' .. marker.instruction:sub(1, 100),
    }
    if markers.enqueue(p.queue, p.seen, item) then append(p, item.label .. ' [queued]'); dispatch(p) end
  end
end

function M.refresh(buf)
  local root = roots.for_buffer(buf)
  if root and projects[root] and not vim.bo[buf].modified then files.checktime(projects[root]) end
end

function M.toggle()
  local p = current()
  if not p then return notify('Open a saved project file first.', vim.log.levels.WARN) end
  for root, other in pairs(projects) do if root ~= p.root then view.hide(other.view) end end
  view.toggle(p.view)
end

function M.status()
  local p = current()
  if not p then return notify('Open a saved project file first.', vim.log.levels.WARN) end
  local connected = {}
  for key, s in pairs(p.sessions) do connected[#connected + 1] = key .. '=' .. (s.ready and 'connected' or 'starting') end
  table.sort(connected)
  render(p)
  notify(p.view.status() .. ', sessions: ' .. (#connected > 0 and table.concat(connected, ', ') or 'off'))
end

local function clear_queue(p)
  for _, item in ipairs(p.queue) do p.seen[item.key] = nil end
  p.queue = {}
end

function M.abort()
  local p = current()
  if not p then return end
  clear_queue(p)
  if p.active then
    p.active.failed = true
    local s = p.active.session
    sessions.send(s, { type = 'clear_queue' })
    sessions.send(s, { type = 'abort' }, function(response)
      if not response.success then append(p, 'Abort failed; use :AIStop') end
      render(p)
    end)
  end
  append(p, 'Local queue cleared; abort requested')
  render(p)
end

function M.stop()
  local p = current()
  if not p then return end
  p.paused = true
  clear_queue(p)
  if p.active then p.seen[p.active.key] = nil; p.active = nil end
  for _, s in pairs(p.sessions) do sessions.stop(s) end
  append(p, 'Stopping Pi RPC sessions')
  render(p)
end

function M.restart()
  local p = current()
  if not p then return end
  if next(p.sessions) or p.active then return notify('Stop sessions with :AIStop, then retry :AIRestart.', vim.log.levels.WARN) end
  p.paused = false
  start(p, 'edit', require('ai.config').options.comments.prompt_tier)
end

return M
