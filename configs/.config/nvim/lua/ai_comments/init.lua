local core = require('ai_comments.core')
local scanner = require('ai_comments.scanner')
local uv = vim.uv
local M = {}
local projects = {}
local selected
local serial = 0
local shutting_down = false
local models = {
  luna = { provider = 'lego-openai', id = 'gpt-6-luna-2026-09-22' },
  opus = { provider = 'lego-anthropic', id = 'eu.anthropic.claude-opus-5-5' },
}

local function session_key(mode, tier)
  return mode .. ':' .. tier
end

local function notify(message, level)
  vim.notify('AI comments: ' .. message, level or vim.log.levels.INFO)
end

local function inside(path, root)
  return path:sub(1, #root + 1) == root .. '/'
end

local function seen_file(root)
  return vim.fn.stdpath('state') .. '/ai-comments/' .. vim.fn.sha256(root) .. '.json'
end

local function load_seen(root)
  local filename = seen_file(root)
  if vim.fn.filereadable(filename) == 0 then return {} end
  local ok, hashes = pcall(vim.json.decode, table.concat(vim.fn.readfile(filename), '\n'))
  if not ok or type(hashes) ~= 'table' then return {} end
  local seen = {}
  for _, hash in ipairs(hashes) do
    if type(hash) == 'string' and hash:match('^%x+$') then seen[hash] = true end
  end
  return seen
end

local function remember(p, key)
  if not key:match('^manual%-') then
    p.handled[key] = true
    local keys = vim.tbl_keys(p.handled)
    if #keys > 1000 then
      -- A bounded cache; if it fills, keep existing entries until explicitly removed.
      return
    end
    local dir = vim.fn.fnamemodify(seen_file(p.root), ':h')
    vim.fn.mkdir(dir, 'p', '0700')
    local ok = pcall(vim.fn.writefile, { vim.json.encode(keys) }, seen_file(p.root))
    if not ok then notify('Could not persist handled-marker history.', vim.log.levels.WARN) end
  end
end

local function root_for(buf)
  if not vim.api.nvim_buf_is_valid(buf) or vim.bo[buf].buftype ~= '' then return nil end
  local name = vim.api.nvim_buf_get_name(buf)
  if name == '' then return nil end
  local path = uv.fs_realpath(name)
  if not path then return nil end
  local git = vim.fs.root(buf, '.git')
  local root = uv.fs_realpath(git or vim.fn.getcwd())
  if root and inside(path, root) then return root, path end
end

local function project(root)
  if not projects[root] then
    local handled = load_seen(root)
    projects[root] = { root = root, sessions = {}, queue = {}, seen = vim.deepcopy(handled),
      handled = handled, log = {}, active = nil, paused = false }
  end
  return projects[root]
end

local function append(p, text)
  for line in (text .. '\n'):gmatch('(.-)\n') do p.log[#p.log + 1] = line end
  while #p.log > 350 do table.remove(p.log, 1) end
end

local function render(p)
  if not p.buf or not vim.api.nvim_buf_is_valid(p.buf) then return end
  local busy = p.active and ('busy (' .. p.active.mode .. '/' .. p.active.tier .. ')')
    or (p.paused and 'stopped (restart required)' or 'idle')
  local lines = { 'Pi  ' .. p.root, 'Status: ' .. busy .. ' | queued: ' .. #p.queue,
    'i: prompt  q: hide  <leader>ai: toggle  :AIStatus / :AIAbort / :AIStop / :AIRestart', '' }
  vim.list_extend(lines, p.log)
  if p.active and p.active.session and p.active.session.stream ~= '' then
    vim.list_extend(lines, vim.split(p.active.session.stream, '\n', { plain = true }))
  end
  vim.bo[p.buf].modifiable = true
  vim.api.nvim_buf_set_lines(p.buf, 0, -1, false, lines)
  vim.bo[p.buf].modifiable = false
  if p.win and vim.api.nvim_win_is_valid(p.win) then
    vim.api.nvim_win_set_cursor(p.win, { #lines, 0 })
  end
end

local function hide(p)
  if p.input_win and vim.api.nvim_win_is_valid(p.input_win) then vim.api.nvim_win_close(p.input_win, true) end
  if p.win and vim.api.nvim_win_is_valid(p.win) then vim.api.nvim_win_close(p.win, true) end
  p.win, p.input_win = nil, nil
end

local function geometry()
  local width = math.max(30, math.floor(vim.o.columns * 0.8))
  local height = math.max(8, math.floor(vim.o.lines * 0.75))
  width = math.min(width, vim.o.columns - 4)
  height = math.min(height, vim.o.lines - 4)
  return width, height, math.floor((vim.o.lines - height) / 2) - 1, math.floor((vim.o.columns - width) / 2)
end

local function current()
  local buf = vim.api.nvim_get_current_buf()
  local root = root_for(buf)
  if root then selected = root end
  return selected and project(selected) or nil
end

local enqueue_prompt -- defined after queue processing

local function open_input(p)
  if not p.win or not vim.api.nvim_win_is_valid(p.win) then return end
  if p.input_win and vim.api.nvim_win_is_valid(p.input_win) then
    vim.api.nvim_set_current_win(p.input_win)
    vim.cmd('startinsert')
    return
  end
  local width, height, row, col = geometry()
  if not p.input_buf or not vim.api.nvim_buf_is_valid(p.input_buf) then
    p.input_buf = vim.api.nvim_create_buf(false, true)
    vim.bo[p.input_buf].buftype = 'nofile'
    vim.bo[p.input_buf].bufhidden = 'hide'
    vim.bo[p.input_buf].filetype = 'text'
    vim.api.nvim_buf_set_lines(p.input_buf, 0, -1, false, { '' })
    vim.keymap.set('i', '<CR>', function()
      local text = vim.trim(table.concat(vim.api.nvim_buf_get_lines(p.input_buf, 0, -1, false), '\n'))
      if text == '' then return end
      vim.api.nvim_buf_set_lines(p.input_buf, 0, -1, false, { '' })
      vim.cmd('stopinsert')
      if p.input_win and vim.api.nvim_win_is_valid(p.input_win) then vim.api.nvim_win_close(p.input_win, true) end
      p.input_win = nil
      enqueue_prompt(p, text)
      if p.win and vim.api.nvim_win_is_valid(p.win) then vim.api.nvim_set_current_win(p.win) end
    end, { buffer = p.input_buf })
    vim.keymap.set('n', '<Esc>', function()
      if p.input_win and vim.api.nvim_win_is_valid(p.input_win) then vim.api.nvim_win_close(p.input_win, true) end
      p.input_win = nil
    end, { buffer = p.input_buf })
  end
  p.input_win = vim.api.nvim_open_win(p.input_buf, true, {
    relative = 'editor', row = row + height - 4, col = col + 2,
    width = width - 4, height = 2, style = 'minimal', border = 'single', title = ' Prompt (Enter to send) ',
  })
  vim.cmd('startinsert')
end

function M.toggle()
  local p = current()
  if not p then return notify('Open a saved project file first.', vim.log.levels.WARN) end
  if p.win and vim.api.nvim_win_is_valid(p.win) then hide(p); return end
  for root, other in pairs(projects) do
    if root ~= p.root and other.win and vim.api.nvim_win_is_valid(other.win) then hide(other) end
  end
  if not p.buf or not vim.api.nvim_buf_is_valid(p.buf) then
    p.buf = vim.api.nvim_create_buf(false, true)
    vim.bo[p.buf].buftype = 'nofile'
    vim.bo[p.buf].bufhidden = 'hide'
    vim.bo[p.buf].filetype = 'markdown'
    vim.keymap.set('n', 'q', function() hide(p) end, { buffer = p.buf })
    vim.keymap.set('n', 'i', function() open_input(p) end, { buffer = p.buf })
  end
  local width, height, row, col = geometry()
  p.win = vim.api.nvim_open_win(p.buf, true, {
    relative = 'editor', row = row, col = col, width = width, height = height,
    style = 'minimal', border = 'single', title = ' AI conversation ',
  })
  vim.wo[p.win].wrap = true
  render(p)
end

local settled

local function send(s, command, callback)
  serial = serial + 1
  local id = 'nvim-' .. serial
  command.id = id
  s.callbacks[id] = callback or function() end
  local ok = pcall(function()
    s.stdin:write(vim.json.encode(command) .. '\n', function(err)
      if err then vim.schedule(function()
        s.callbacks[id] = nil
        append(s.project, 'RPC write failed')
        s.project.paused = true
        if s.project.active and s.project.active.session == s then settled(s, false) end
        render(s.project)
        if s.handle and not s.handle:is_closing() then s.handle:kill('sigterm') end
      end) end
    end)
  end)
  if not ok then s.callbacks[id] = nil; return false end
  return true
end

local dispatch

local function disk_matches(path, buf)
  if vim.bo[buf].fileformat ~= 'unix' or vim.bo[buf].binary or vim.bo[buf].modified then return false end
  local stat = uv.fs_stat(path)
  if not stat or stat.size > 2 * 1024 * 1024 then return false end
  local fd = uv.fs_open(path, 'r', 0)
  if not fd then return false end
  local bytes = uv.fs_read(fd, stat.size, 0)
  uv.fs_close(fd)
  local lines = vim.api.nvim_buf_get_lines(buf, 0, -1, false)
  local expected = table.concat(lines, '\n') .. (vim.bo[buf].endofline and '\n' or '')
  return bytes == expected, lines
end

local function safe_checktime(p)
  for _, buf in ipairs(vim.api.nvim_list_bufs()) do
    local root = root_for(buf)
    if root == p.root and not vim.bo[buf].modified then
      pcall(vim.api.nvim_buf_call, buf, function() vim.cmd('checktime') end)
    end
  end
end

local function cleanup(p, item)
  if not item.marker then return end
  safe_checktime(p)
  local buf = item.buf
  if not vim.api.nvim_buf_is_valid(buf) or vim.api.nvim_buf_get_name(buf) ~= item.path then
    return notify('Marker retained: original buffer unavailable.', vim.log.levels.WARN)
  end
  local root = root_for(buf)
  if root ~= p.root then return end
  local match, lines = disk_matches(item.path, buf)
  local replacement = match and core.cleanup_line(lines, item.marker)
  if not replacement then
    return notify('Marker retained: file or buffer changed; handled request will not replay.', vim.log.levels.WARN)
  end
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, replacement)
  local ok = pcall(vim.api.nvim_buf_call, buf, function() vim.cmd('noautocmd write') end)
  if not ok then
    notify('Marker cleanup could not be saved; check the buffer before writing.', vim.log.levels.WARN)
  end
end

settled = function(s, success)
  local p = s.project
  local item = p.active
  if not item or item.session ~= s then return end
  p.active = nil
  s.stream = ''
  if success and not item.failed and not item.assistant_error and not next(item.tool_errors or {}) then
    append(p, 'Settled: ' .. item.label)
    remember(p, item.key)
    cleanup(p, item)
  else
    append(p, 'Failed/aborted: ' .. item.label .. ' (marker retained)')
    p.seen[item.key] = nil
  end
  safe_checktime(p)
  render(p)
  vim.schedule(function() dispatch(p) end)
end

local function message_text(message)
  local parts = {}
  for _, block in ipairs(message.content or {}) do
    if block.type == 'text' and block.text then parts[#parts + 1] = block.text end
  end
  return table.concat(parts)
end

local function record(s, data)
  local p = s.project
  if data.type == 'response' then
    local cb = s.callbacks[data.id]
    if cb then s.callbacks[data.id] = nil; cb(data) end
    if not cb and data.success == false then
      append(p, 'Unmatched Pi command/parse error')
      if p.active and p.active.session == s then p.active.failed = true end
      render(p)
    end
  elseif data.type == 'message_update' then
    local ev = data.assistantMessageEvent or {}
    if ev.type == 'text_delta' then
      s.stream = (s.stream .. (ev.delta or '')):sub(-20000)
      render(p)
    elseif ev.type == 'text_end' then
      s.stream = ev.content or s.stream
      render(p)
    end
  elseif data.type == 'message_end' and data.message and data.message.role == 'assistant' then
    local text = message_text(data.message)
    if text ~= '' then append(p, 'Pi: ' .. text:sub(-20000)) end
    s.stream = ''
    local reason = data.message.stopReason
    if p.active and p.active.session == s and reason then
      p.active.assistant_error = reason ~= 'stop' and reason ~= 'toolUse'
      if p.active.assistant_error then append(p, 'Assistant stopped: ' .. reason) end
    end
    render(p)
  elseif data.type == 'tool_execution_start' then
    append(p, 'Tool: ' .. (data.toolName or '?') .. ' running')
    render(p)
  elseif data.type == 'tool_execution_end' then
    append(p, 'Tool: ' .. (data.toolName or '?') .. (data.isError and ' failed' or ' done'))
    if p.active and p.active.session == s then
      local errors = p.active.tool_errors or {}
      p.active.tool_errors = errors
      local name = data.toolName or '?'
      if data.isError then
        errors[name] = true
      else
        errors[name] = nil
        if name == 'edit' or name == 'write' then errors.edit = nil; errors.write = nil end
      end
    end
    safe_checktime(p)
    render(p)
  elseif data.type == 'agent_settled' then
    if p.active and p.active.session == s then
      p.active.settled = true
      if p.active.accepted then settled(s, true) end
    end
  elseif data.type == 'auto_retry_start' or data.type == 'compaction_start' then
    append(p, 'Pi: ' .. data.type)
    render(p)
  elseif data.type == 'extension_ui_request' then
    append(p, 'Pi extension requested unsupported UI interaction; check session.')
    render(p)
  end
end

local function start(p, mode, tier)
  local key = session_key(mode, tier)
  if p.sessions[key] then return p.sessions[key] end
  local stdin, stdout, stderr = uv.new_pipe(false), uv.new_pipe(false), uv.new_pipe(false)
  local hash = vim.fn.sha256(p.root .. ':' .. key)
  local id = hash:sub(1, 8) .. '-' .. hash:sub(9, 12) .. '-4' .. hash:sub(14, 16)
    .. '-8' .. hash:sub(18, 20) .. '-' .. hash:sub(21, 32)
  local model = models[tier]
  local args = { '--mode', 'rpc', '--session-id', id,
    '--provider', model.provider, '--model', model.id }
  if tier == 'opus' then vim.list_extend(args, { '--thinking', 'medium' }) end
  if mode == 'question' then
    vim.list_extend(args, { '--tools', 'read,grep,find,ls', '--no-extensions' })
  end
  local s = { project = p, mode = mode, tier = tier, stdin = stdin, stdout = stdout, stderr = stderr,
    callbacks = {}, parser = { pending = '' }, stream = '', ready = false, stopping = false }
  local handle, startup
  local err
  handle, err = uv.spawn('pi', { args = args, cwd = p.root, stdio = { stdin, stdout, stderr } }, function(code)
    vim.schedule(function()
      s.ready = false
      p.sessions[key] = nil
      if startup and not startup:is_closing() then startup:stop(); startup:close() end
      for _, pipe in ipairs({ stdin, stdout, stderr }) do if not pipe:is_closing() then pipe:close() end end
      if handle and not handle:is_closing() then handle:close() end
      if not s.stopping and not shutting_down then
        p.paused = true
        append(p, 'Pi ' .. key .. ' exited (code ' .. code .. '); :AIRestart to reconnect.')
        if p.active and p.active.session == s then settled(s, false) end
        render(p)
        notify('Pi RPC exited; use :AIRestart.', vim.log.levels.ERROR)
      end
    end)
  end)
  if not handle then
    for _, pipe in ipairs({ stdin, stdout, stderr }) do pipe:close() end
    p.paused = true
    append(p, 'Cannot start Pi RPC: ' .. tostring(err))
    render(p)
    return nil
  end
  s.handle = handle
  p.sessions[key] = s
  startup = uv.new_timer()
  startup:start(10000, 0, function()
    vim.schedule(function()
      if s.ready or s.stopping or p.sessions[key] ~= s then return end
      append(p, 'Pi startup timed out; :AIRestart after exit')
      render(p)
      if not s.handle:is_closing() then s.handle:kill('sigterm') end
    end)
    startup:close()
  end)
  stdout:read_start(function(read_err, chunk)
    vim.schedule(function()
      if read_err then
        append(p, 'RPC stdout read error')
        if p.active and p.active.session == s then p.active.failed = true end
        render(p)
      end
      if chunk then core.feed(s.parser, chunk, function(value) record(s, value) end,
        function()
          append(p, 'Malformed/oversized RPC record')
          if p.active and p.active.session == s then p.active.failed = true end
          render(p)
        end) end
    end)
  end)
  stderr:read_start(function(_, chunk)
    if chunk then vim.schedule(function()
      -- stderr can contain paths, prompt content or credentials: never copy it into notifications.
      if not s.stderr_seen then
        s.stderr_seen = true
        append(p, 'Pi stderr diagnostic (details withheld)')
        render(p)
      end
    end) end
  end)
  send(s, { type = 'get_state' }, function(response)
    if not startup:is_closing() then startup:stop(); startup:close() end
    if not response.success then
      append(p, 'Pi initialization failed; :AIRestart after exit')
      render(p)
      s.stdin:shutdown()
      return
    end
    local selected_model = response.data and response.data.model or {}
    if selected_model.provider ~= model.provider or selected_model.id ~= model.id then
      p.paused = true
      append(p, 'Refusing mismatched persisted model for ' .. key .. '; expected ' .. model.provider .. '/' .. model.id)
      render(p)
      s.stdin:shutdown()
      return
    end
    local function ready()
      s.ready = true
      append(p, 'Connected: ' .. key .. ' (persisted project session)')
      send(s, { type = 'get_messages' }, function(history)
        if history.success then
          local messages = history.data and history.data.messages or {}
          for _, msg in ipairs(messages) do
            if msg.role == 'assistant' then
              local text = message_text(msg)
              if text ~= '' then append(p, 'Previous Pi: ' .. text:sub(-1000)) end
            end
          end
        end
        render(p)
      end)
      dispatch(p)
    end
    if tier == 'opus' and response.data.thinkingLevel ~= 'medium' then
      send(s, { type = 'set_thinking_level', level = 'medium' }, function(result)
        if not result.success then
          p.paused = true
          append(p, 'Could not set Opus thinking level to medium; :AIRestart after exit')
          render(p)
          s.stdin:shutdown()
          return
        end
        ready()
      end)
    else
      ready()
    end
  end)
  return s
end

dispatch = function(p)
  if p.paused or p.active or #p.queue == 0 then render(p); return end
  local item = p.queue[1]
  local s = start(p, item.mode, item.tier)
  if not s or not s.ready then render(p); return end
  core.pop(p.queue)
  item.session = s
  p.active = item
  append(p, item.label .. ' [sent]')
  if not send(s, { type = 'prompt', message = item.prompt }, function(response)
    if not response.success or (response.data and response.data.disposition == 'handled') then
      append(p, 'Prompt rejected/handled without a run')
      settled(s, false)
      return
    end
    if p.active == item then
      item.accepted = true
      if item.settled then settled(s, true) end
    end
  end) then settled(s, false) end
  render(p)
end

enqueue_prompt = function(p, text)
  serial = serial + 1
  local item = { key = 'manual-' .. serial, mode = 'edit', tier = 'luna',
    label = 'Prompt (Luna): ' .. text:sub(1, 100), prompt = text }
  core.enqueue(p.queue, p.seen, item)
  append(p, item.label .. ' [queued]')
  dispatch(p)
end

local function saved(buf)
  local root, path = root_for(buf)
  if not root or vim.bo[buf].modified then return end
  local p = project(root)
  local match, lines = disk_matches(path, buf)
  if not match then return end
  for _, marker in ipairs(scanner.scan(buf, lines, vim.bo[buf].filetype)) do
    local relative = path:sub(#root + 2)
    local key = vim.fn.sha256(core.key(path, marker))
    local start_line, end_line = math.max(1, marker.number - 8), math.min(#lines, marker.number + 8)
    local snippet = {}
    for i = start_line, end_line do
      snippet[#snippet + 1] = i .. ': ' .. lines[i]:sub(1, 300)
    end
    local mode = marker.kind:sub(1, 1) == '?' and 'question' or 'edit'
    local tier = #marker.kind == 2 and 'opus' or 'luna'
    local prompt = string.format('Project-relative file: %s\nLine: %d\nRequest: %s\n%s\nNearby saved lines (bounded; inspect the actual saved file before %s):\n%s',
      relative, marker.number, marker.instruction,
      marker.context ~= '' and ('Additional context: ' .. marker.context:sub(1, 1200) .. '\n') or '',
      mode == 'edit' and 'editing' or 'answering', table.concat(snippet, '\n'))
    if mode == 'question' then prompt = prompt .. '\nAnswer using read-only tools.' end
    local item = { key = key, marker = marker, path = path, buf = buf, mode = mode, tier = tier,
      prompt = prompt, label = relative .. ':' .. marker.number .. ' AI' .. marker.kind .. ' [' .. tier .. '] '
        .. marker.instruction:sub(1, 100) }
    if core.enqueue(p.queue, p.seen, item) then
      append(p, item.label .. ' [queued]')
      dispatch(p)
    end
  end
end

function M.status()
  local p = current()
  if not p then return notify('Open a saved project file first.', vim.log.levels.WARN) end
  render(p)
  local connected = {}
  for key, s in pairs(p.sessions) do connected[#connected + 1] = key .. '=' .. (s.ready and 'connected' or 'starting') end
  table.sort(connected)
  notify((p.active and 'busy' or (p.paused and 'stopped' or 'idle')) .. ', queued: ' .. #p.queue
    .. ', sessions: ' .. (#connected > 0 and table.concat(connected, ', ') or 'off'))
end

function M.abort()
  local p = current()
  if not p then return end
  for _, item in ipairs(p.queue) do p.seen[item.key] = nil end
  p.queue = {}
  if p.active then
    p.active.failed = true
    local s = p.active.session
    send(s, { type = 'clear_queue' })
    send(s, { type = 'abort' }, function(response)
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
  for _, item in ipairs(p.queue) do p.seen[item.key] = nil end
  p.queue = {}
  if p.active then p.seen[p.active.key] = nil; p.active = nil end
  for _, s in pairs(p.sessions) do
    s.stopping = true
    if not s.stdin:is_closing() then s.stdin:shutdown() end
    local timer = uv.new_timer()
    timer:start(3000, 0, function()
      timer:close()
      if not s.handle:is_closing() then s.handle:kill('sigterm') end
    end)
  end
  append(p, 'Stopping Pi RPC sessions')
  render(p)
end

function M.restart()
  local p = current()
  if not p then return end
  if next(p.sessions) or p.active then
    return notify('Stop sessions with :AIStop, then retry :AIRestart.', vim.log.levels.WARN)
  end
  p.paused = false
  start(p, 'edit', 'luna')
end

function M.setup()
  vim.keymap.set('n', '<leader>ai', M.toggle, { desc = 'Toggle project AI conversation' })
  vim.api.nvim_create_user_command('AIToggle', M.toggle, {})
  vim.api.nvim_create_user_command('AIStatus', M.status, {})
  vim.api.nvim_create_user_command('AIAbort', M.abort, {})
  vim.api.nvim_create_user_command('AIStop', M.stop, {})
  vim.api.nvim_create_user_command('AIRestart', M.restart, {})
  local group = vim.api.nvim_create_augroup('AIComments', { clear = true })
  vim.api.nvim_create_autocmd('BufWritePost', { group = group, callback = function(ev) saved(ev.buf) end })
  vim.api.nvim_create_autocmd({ 'FocusGained', 'BufEnter' }, { group = group, callback = function(ev)
    local root = root_for(ev.buf)
    if root and projects[root] and not vim.bo[ev.buf].modified then safe_checktime(projects[root]) end
  end })
  vim.api.nvim_create_autocmd('VimLeavePre', { group = group, callback = function()
    shutting_down = true
    for _, p in pairs(projects) do
      for _, s in pairs(p.sessions) do
        s.stopping = true
        if not s.stdin:is_closing() then s.stdin:shutdown() end
      end
    end
  end })
end

return M
