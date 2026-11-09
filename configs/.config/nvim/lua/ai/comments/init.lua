-- Saved-comment workflow: one FIFO per profile/project, four isolated Pi sessions.
local markers = require('ai.comments.markers')
local scanner = require('ai.comments.scanner')
local storage = require('ai.comments.storage')
local files = require('ai.comments.files')
local roots = require('ai.project')
local sessions = require('ai.session')
local protocol = require('ai.protocol')
local view = require('ai.ui.view')
local tools = require('ai.ui.tools')
local timeline = require('ai.ui.timeline')
local profiles = require('ai.profiles')
local M = {}
local projects = {}
local selected
local serial = 0
local transition_save_notice
local dispatch, finish, enqueue_prompt

local function notify(text, level)
  vim.notify('AI: ' .. text, level or vim.log.levels.INFO)
end
local function owns(p) return profiles.allows(p.token) end
local function same_token(left, right)
  return type(left) == 'table' and type(right) == 'table'
    and left.name == right.name and left.generation == right.generation
end

local function project(root, selected_profile)
  local profile = selected_profile or profiles.current()
  local key = profile.name .. '\n' .. root
  if projects[key] then
    local p = projects[key]
    p.token = profiles.token()
    view.set_submit(p.view, function(text) return enqueue_prompt(p, text) end)
    return p
  end
  local handled = storage.load(root)
  local p = { root = root, profile = profile, token = profiles.token(), sessions = {}, session_tokens = {}, queue = {},
    handled = handled, seen = vim.deepcopy(handled), paused = false }
  p.view = view.new(root, 'Pi project (' .. profile.name .. ')',
    'i prompt · za fold · ^L clear · q hide',
    function()
      local status = p.new_pending and 'starting new conversation' or p.active and ('busy (' .. p.active.mode .. '/' .. p.active.role .. ')')
        or (p.paused and 'stopped (restart required)' or 'idle')
      return 'Status: ' .. status .. ' | queued: ' .. #p.queue
    end,
    function() return p.active and p.active.session.stream or '' end,
    function(text) return enqueue_prompt(p, text) end, profile.name .. ':project',
    function() return p.active and p.active.session.model.id end)
  projects[key] = p
  return p
end

local function current()
  selected = roots.current() or selected
  return selected and project(selected)
end

local function append(p, text, level) view.event(p.view, level or 'info', text) end
local function render(p) view.render(p.view) end

finish = function(p, session, success)
  local item = p.active
  if not item or item.session ~= session or not profiles.allows(item.token) then return end
  p.active = nil
  session.stream, session.blocks = '', {}
  if success and not item.failed and not item.assistant_error and not next(item.tool_errors or {}) then
    append(p, 'Settled: ' .. item.label)
    storage.remember(p, item.key)
    files.cleanup(p, item)
  else
    append(p, 'Failed/aborted: ' .. item.label .. ' (marker retained)', 'error')
    p.seen[item.key] = nil
  end
  files.checktime(p)
  render(p)
  local token, next_item = item.token, p.queue[1]
  vim.schedule(function()
    if profiles.allows(token) and same_token(p.token, token) and p.queue[1] == next_item then
      dispatch(p, token, next_item, true)
    end
  end)
end

local function record(p, session, event, token, key)
  if not profiles.allows(token) or p.sessions[key] ~= session then return end
  local item = p.active
  if item and (item.session ~= session or not same_token(item.token, token)) then item = nil end
  if event.type == 'message_start' and event.message and event.message.role == 'assistant' then
    session.stream, session.blocks = '', {}
  elseif event.type == 'message_update' then
    protocol.update(session, event.assistantMessageEvent or {})
  elseif event.type == 'message_end' and event.message and event.message.role == 'assistant' then
    local text = protocol.text(event.message)
    if text ~= '' then
      view.message(p.view, 'assistant', protocol.clip(text, require('ai.config').options.limits.response_bytes), { model = session.model.id })
    end
    session.stream, session.blocks = '', {}
    local reason = event.message.stopReason
    if item and reason then
      item.assistant_error = reason ~= 'stop' and reason ~= 'toolUse'
      if item.assistant_error then append(p, 'Assistant stopped: ' .. reason, 'warn') end
    end
  elseif event.type == 'tool_execution_start' then
    view.add(p.view, tools.start(session, event))
  elseif event.type == 'tool_execution_end' then
    local name = event.toolName or '?'
    view.add(p.view, tools.finish(session, event))
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
    if vim.tbl_contains({ 'select', 'confirm', 'input', 'editor' }, event.method) then
      sessions.send(session, { type = 'extension_ui_response', id = event.id, cancelled = true })
      append(p, 'Pi extension dialog cancelled (unsupported in this UI).', 'warn')
    end
  elseif event.type == 'response' and event.success == false then
    append(p, 'Unmatched Pi command/parse error', 'error')
    if item then item.failed = true end
  elseif event.type == 'extension_error' then
    append(p, 'Pi extension error (details withheld)', 'error')
    if item then item.failed = true end
  end
  render(p)
end

local start
start = function(p, mode, role)
  local key = mode .. ':' .. role
  if p.sessions[key] then return p.sessions[key] end
  if not owns(p) then return end
  local token = profiles.token()
  if not profiles.allows(token) then return end
  local session
  local function owns_session(value)
    return value and p.sessions[key] == value and profiles.allows(token)
  end
  local err
  session, err = sessions.start(p.root, mode, role, {
    on_event = function(s, event) record(p, s, event, token, key) end,
    on_diagnostic = function(text) if session and owns_session(session) then append(p, text, 'warn'); render(p) end end,
    on_error = function(s, text)
      if not owns_session(s) then return end
      p.paused = true
      append(p, text, 'error')
      finish(p, s, false)
      render(p)
    end,
    on_exit = function(s, code, stopping)
      local current_slot = p.sessions[key] == s
      if current_slot then p.sessions[key], p.session_tokens[key] = nil, nil end
      if current_slot and profiles.allows(token) and not stopping then
        p.paused = true
        append(p, 'Pi ' .. key .. ' exited (code ' .. code .. '); :AIRestart to reconnect.', 'error')
        finish(p, s, false)
        notify('Pi RPC exited; use :AIRestart.', vim.log.levels.ERROR)
      end
      if current_slot and profiles.allows(token) and p.new_pending == key then
        p.new_pending, p.paused = nil, false
        start(p, mode, role)
      end
      if current_slot and profiles.allows(token) then render(p) end
    end,
    on_ready = function(_, history)
      if not owns_session(session) then return end
      append(p, 'Connected: ' .. key .. ' (persisted project session)')
      local restored = {}
      for _, message in ipairs(history) do
        if message.role == 'assistant' then
          local text = protocol.text(message)
          if text ~= '' then
            restored[#restored + 1] = timeline.message({ role = 'assistant', restored = true, model = session.model.id,
              text = protocol.clip(text, require('ai.config').options.limits.restored_bytes) })
          end
        end
      end
      if require('ai.config').options.ui.restore_history then
        for _, e in ipairs(restored) do view.add(p.view, e) end
      else
        view.hold_history(p.view, restored, key)
      end
      render(p)
      dispatch(p, token)
    end,
  })
  if not session then if profiles.allows(token) then p.paused = true; append(p, err, 'error'); render(p) end; return end
  p.sessions[key], p.session_tokens[key] = session, token
  return session
end

dispatch = function(p, token, expected_head, strict_head)
  token = token or p.token
  if not profiles.allows(token) or not same_token(p.token, token) or p.paused or p.active then render(p); return end
  if strict_head and p.queue[1] ~= expected_head then return end
  if #p.queue == 0 then render(p); return end
  local item = p.queue[1]
  if not profiles.allows(item.token) then return end
  local session = start(p, item.mode, item.role)
  local key = item.mode .. ':' .. item.role
  if not session or not p.session_tokens[key] or not profiles.allows(p.session_tokens[key]) or not session.ready then render(p); return end
  markers.pop(p.queue)
  item.session, p.active = session, item
  view.message(p.view, 'user', item.text, { label = item.user_label })
  if not sessions.send(session, { type = 'prompt', message = item.prompt }, function(response)
    if not profiles.allows(item.token) or p.sessions[key] ~= session or p.active ~= item then return end
    if not response.success or response.data and response.data.disposition == 'handled' then
      append(p, 'Prompt rejected/handled without a run', 'error')
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
  if not owns(p) or p.new_pending then return false end
  serial = serial + 1
  local role = require('ai.config').options.comments.prompt_role
  local item = { key = 'manual-' .. serial, mode = 'edit', role = role, token = profiles.token(),
    label = 'Prompt (' .. role .. '): ' .. text:sub(1, 100), text = text, user_label = 'Prompt',
    prompt = require('ai.prompts').manual(text, p.prompt_path) }
  markers.enqueue(p.queue, p.seen, item)
  append(p, item.label .. ' [queued]')
  dispatch(p)
end

function M.saved(buf)
  local root, path = roots.for_buffer(buf)
  if not root or vim.bo[buf].modified then return end
  local match, lines = files.matches(path, buf)
  if not match then return end
  local found = scanner.scan(buf, lines, vim.bo[buf].filetype)
  if #found == 0 then return end
  local token = profiles.token()
  if not profiles.allows(token) then
    if transition_save_notice ~= token.generation then
      transition_save_notice = token.generation
      notify('Profile transition is locked; saved markers were retained—resave after switching or recovery.', vim.log.levels.WARN)
    end
    return
  end
  transition_save_notice = nil
  local p = project(root)
  if not owns(p) then return end
  for _, marker in ipairs(found) do
    local mode = marker.kind:sub(1, 1) == '?' and 'question' or 'edit'
    local role = #marker.kind == 2 and 'expensive' or 'cheap'
    local key = vim.fn.sha256(markers.key(path, marker))
    local item = {
      key = key, marker = marker, path = path, buf = buf, mode = mode, role = role, token = token,
      prompt = require('ai.prompts').comment(root, path, marker, lines, mode),
      text = marker.instruction, user_label = 'AI' .. marker.kind .. ' ' .. path:sub(#root + 2) .. ':' .. marker.number,
      label = path:sub(#root + 2) .. ':' .. marker.number .. ' AI' .. marker.kind .. ' [' .. role .. '] ' .. marker.instruction:sub(1, 100),
    }
    if not p.handled[key] and markers.enqueue(p.queue, p.seen, item) then
      append(p, item.label .. ' [queued]')
      dispatch(p)
    end
  end
end

function M.refresh(buf)
  if not profiles.allows(profiles.token()) then return end
  local root = roots.for_buffer(buf)
  if root and projects[profiles.current().name .. '\n' .. root] and not vim.bo[buf].modified then
    files.checktime(projects[profiles.current().name .. '\n' .. root])
  end
end

function M.toggle()
  if not profiles.allows(profiles.token()) then return notify('Profile transition is locked; retry after switching or recovery.', vim.log.levels.WARN) end
  local buf = vim.api.nvim_get_current_buf()
  local _, path = roots.for_buffer(buf)
  local p = current()
  if not p then return notify('Open a saved project file first.', vim.log.levels.WARN) end
  for _, other in pairs(projects) do if other.profile.name == p.profile.name and other.root ~= p.root then view.hide(other.view) end end
  if view.toggle(p.view) and not vim.b[buf].ai_root then p.prompt_path = path end
end

function M.clear()
  if not profiles.allows(profiles.token()) then return notify('Profile transition is locked; retry after switching or recovery.', vim.log.levels.WARN) end
  local p = current()
  if p then view.clear(p.view) end
end

function M.new()
  if not profiles.allows(profiles.token()) then return notify('Profile transition is locked; retry after switching or recovery.', vim.log.levels.WARN) end
  local p = current()
  if not p then return notify('Open a saved project file first.', vim.log.levels.WARN) end
  local role = require('ai.config').options.comments.prompt_role
  local key = 'edit:' .. role
  local session = p.sessions[key]
  local transitioning = false
  for _, s in pairs(p.sessions) do
    if not s.ready or s.client.stopping then transitioning = true end
  end
  if p.new_pending or p.active or #p.queue > 0 or transitioning then
    return notify('Finish pending work or use :AIStop and wait for exit before :AINew.', vim.log.levels.WARN)
  end
  local identity, identity_err = sessions.identity(p.root, 'edit', role, p.profile)
  if not identity then return notify('AI: ' .. identity_err, vim.log.levels.ERROR) end
  local id, err = require('ai.session_ids').fresh(identity)
  if not id then return notify(err, vim.log.levels.ERROR) end
  view.reset(p.view)
  if session then
    p.new_pending, p.paused = key, true
    sessions.stop(session)
  else
    p.paused = false
    start(p, 'edit', role)
  end
  render(p)
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
  if not profiles.allows(profiles.token()) then return notify('Profile transition is locked; retry after switching or recovery.', vim.log.levels.WARN) end
  local p = current()
  if not p then return end
  clear_queue(p)
  if p.active then
    local item, token, s = p.active, p.active.token, p.active.session
    local key = item.mode .. ':' .. item.role
    item.failed = true
    sessions.send(s, { type = 'clear_queue' })
    sessions.send(s, { type = 'abort' }, function(response)
      if not profiles.allows(token) or not same_token(p.token, token) or p.active ~= item
        or p.sessions[key] ~= s or item.session ~= s then return end
      if not response.success then append(p, 'Abort failed; use :AIStop', 'error') end
      render(p)
    end)
  end
  append(p, 'Local queue cleared; abort requested', 'warn')
  render(p)
end

local function stop_project(p)
  p.paused, p.new_pending = true, nil
  clear_queue(p)
  if p.active then p.seen[p.active.key] = nil; p.active = nil end
  for _, s in pairs(p.sessions) do sessions.stop(s) end
  append(p, 'Stopping Pi RPC sessions')
  render(p)
end

function M.stop()
  if not profiles.allows(profiles.token()) then return notify('Profile transition is locked; retry after switching or recovery.', vim.log.levels.WARN) end
  local p = current()
  if p then stop_project(p) end
end

function M.stop_all()
  for _, p in pairs(projects) do
    stop_project(p)
    view.hide(p.view)
  end
end

function M.busy_reason()
  for _, p in pairs(projects) do
    if p.active or #p.queue > 0 or p.new_pending then return 'project conversation has active or queued work' end
    for _, s in pairs(p.sessions) do
      if not s.ready or s.client.stopping then return 'project Pi session is connecting or exiting' end
    end
  end
end

function M.retire()
  for _, p in pairs(projects) do
    for _, s in pairs(p.sessions) do sessions.stop(s) end
    view.hide(p.view)
  end
end

function M.log(root, entry, profile_name)
  local selected_profile = profile_name and require('ai.config').profile(profile_name) or profiles.current()
  if selected_profile.name ~= profiles.current().name then return end
  local p = project(root, selected_profile)
  view.add(p.view, entry)
  render(p)
end

function M.restart()
  if not profiles.allows(profiles.token()) then return notify('Profile transition is locked; retry after switching or recovery.', vim.log.levels.WARN) end
  local p = current()
  if not p then return end
  if next(p.sessions) or p.active then return notify('Stop sessions with :AIStop, then retry :AIRestart.', vim.log.levels.WARN) end
  p.paused = false
  start(p, 'edit', require('ai.config').options.comments.prompt_role)
end

return M
