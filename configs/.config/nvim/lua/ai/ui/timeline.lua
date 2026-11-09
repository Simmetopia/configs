-- Pure conversation timeline: typed entries -> lines, extmark specs and event-group headers.
-- Marks are { row0, col0, opts } ready for nvim_buf_set_extmark.
local M = {}
local highlights = require('ai.ui.highlights')

local uid = 0
local function entry(kind, fields)
  uid = uid + 1
  fields.kind, fields.uid = kind, uid
  return fields
end

function M.short_model(id)
  if not id then return nil end
  return (id:gsub('^%w+%.anthropic%.', ''):gsub('%-%d%d%d%d%-%d%d%-%d%d$', ''))
end

function M.message(opts)
  return entry('message', {
    role = opts.role, text = opts.text or '', label = opts.label, model = M.short_model(opts.model),
    restored = opts.restored, time = opts.time or (not opts.restored and os.time() or nil),
  })
end

function M.tool(opts)
  return entry('tool', {
    call_id = opts.call_id, name = opts.name, detail = opts.detail, state = opts.state,
    started = opts.started, elapsed = opts.elapsed,
  })
end

function M.event(level, text)
  return entry('event', { level = level, text = text })
end

-- Split a body into lines, closing an unbalanced code fence. Returns lines and the 1-based fenced rows.
local function body(text)
  local lines, fenced = {}, {}
  local fence_char, fence_length
  for _, line in ipairs(vim.split(text, '\n', { plain = true })) do
    lines[#lines + 1] = line
    local indent, fence, rest = line:match('^(%s*)([`~]+)(.*)$')
    if indent and #indent <= 3 and (fence:match('^`+$') or fence:match('^~+$')) and #fence >= 3 then
      if not fence_char then
        fence_char, fence_length = fence:sub(1, 1), #fence
      elseif fence:sub(1, 1) == fence_char and #fence >= fence_length and rest:match('^%s*$') then
        fence_char, fence_length = nil, nil
      end
      fenced[#lines] = true
    elseif fence_char then
      fenced[#lines] = true
    end
  end
  if fence_char then
    lines[#lines + 1] = fence_char:rep(fence_length)
    fenced[#lines] = true
  end
  return lines, fenced
end

local function message_header(e, streaming)
  local author
  if e.role == 'user' then
    author = e.label and ('You · ' .. e.label) or 'You'
  else
    author = 'Pi'
    if e.restored then author = author .. ' · restored'
    elseif e.model then author = author .. ' · ' .. e.model end
    if streaming then author = author .. ' · responding ⋯' end
  end
  return '## ' .. author
end

local function truncate(line, budget)
  if vim.fn.strdisplaywidth(line) <= budget then return line end
  local n = vim.fn.strchars(line)
  while n > 0 and vim.fn.strdisplaywidth(vim.fn.strcharpart(line, 0, n) .. '…') > budget do n = n - 1 end
  return vim.fn.strcharpart(line, 0, n) .. '…'
end

local function info(e) return e.kind == 'event' and e.level == 'info' end

local function event_lines(e, icons)
  local prefix = e.level == 'warn' and icons.warn .. ' ' or e.level == 'error' and icons.error .. ' ' or '· '
  local lines = vim.split(e.text, '\n', { plain = true })
  lines[1] = prefix .. lines[1]
  for i = 2, #lines do lines[i] = '  ' .. lines[i] end
  return lines
end

local event_hl = { info = 'AIEvent', warn = 'AIEventWarn', error = 'AIEventError' }
local tool_hl = { edit = 'AIToolWrite', write = 'AIToolWrite', bash = 'AIToolExec' }

function M.height(e)
  if e.kind == 'message' then
    return #body(e.text) + 2
  elseif e.kind == 'event' then
    return #vim.split(e.text, '\n', { plain = true })
  end
  return 1
end

function M.render(entries, opts)
  local icons = highlights.icons()
  local lines, marks, groups, messages = {}, {}, {}, {}
  local function add(text) lines[#lines + 1] = text; return #lines - 1 end
  local function mark(row, col, o) marks[#marks + 1] = { row, col, o } end
  local function span(row, text, group) if #text > 0 then mark(row, 0, { end_col = #text, hl_group = group, priority = 200 }) end end

  local function message(e, header_text, text, streaming)
    local group = e.restored and 'AIBandRestored' or e.role == 'user' and 'AIBandUser' or 'AIBandAssistant'
    local icon = e.role == 'user' and icons.user or icons.assistant
    local header = truncate(header_text, opts.width - 6 - vim.fn.strdisplaywidth(icon .. ' '))
    local row = add(header)
    mark(row, 0, { line_hl_group = group })
    mark(row, 0, { virt_text = { { icons.band .. ' ', group } }, virt_text_pos = 'overlay' })
    mark(row, 3, { virt_text = { { icon .. ' ', group } }, virt_text_pos = 'inline' })
    mark(row, 0, { end_col = #header, hl_group = group, priority = 200 })
    local body_lines, fenced = body(text)
    local folded = not streaming and opts.folded and opts.folded[e.uid]
    local meta = {}
    if folded then meta[1] = { icons.fold_closed .. (' %d lines  '):format(#body_lines), 'AIBandMeta' } end
    if e.time and not streaming then meta[#meta + 1] = { os.date('%H:%M', e.time), { group, 'AIBandMeta' } } end
    if #meta > 0 then mark(row, 0, { virt_text = meta, virt_text_pos = 'right_align' }) end
    if not folded then
      for i, line in ipairs(body_lines) do
        local r = add(line)
        if fenced[i] then mark(r, 0, { line_hl_group = 'AICode' }) end
      end
    end
    if not streaming then messages[#messages + 1] = { first = row, last = #lines - 1, key = e.uid } end
    add('')
  end

  local i, n = 1, #entries
  while i <= n do
    local e = entries[i]
    if e.kind == 'message' then
      message(e, message_header(e), e.text)
      i = i + 1
    else
      if info(e) then
        local j = i
        while j < n and info(entries[j + 1]) do j = j + 1 end
        local count = j - i + 1
        if count == 1 then
          for _, line in ipairs(event_lines(e, icons)) do span(add(line), line, 'AIEvent') end
        else
          local is_open = opts.open and opts.open[e.uid]
          local header = is_open and ('%s %d events'):format(icons.fold_open, count)
            or ('%s %d events · %s'):format(icons.fold_closed, count, vim.split(entries[j].text, '\n', { plain = true })[1])
          local row = add(header)
          mark(row, 0, { line_hl_group = 'AIFold' })
          local group = { row = row, key = e.uid }
          groups[#groups + 1] = group
          if is_open then
            for k = i, j do
              for _, line in ipairs(event_lines(entries[k], icons)) do span(add(line), line, 'AIEvent') end
            end
          end
          group.last = #lines - 1
        end
        i = j + 1
      else
        if e.kind == 'tool' then
          local line = '  [' .. e.name .. ']' .. (e.detail and e.detail ~= '' and ' ' .. e.detail or '')
          local row = add(line)
          mark(row, 2, { end_col = 4 + #e.name, hl_group = tool_hl[e.name] or 'AIToolRead', priority = 200 })
          local text, group = icons.running, 'AIToolRunning'
          if e.state == 'done' then text, group = icons.ok, 'AIToolOk'
          elseif e.state == 'failed' then text, group = icons.failed, 'AIToolFailed' end
          if type(e.elapsed) == 'number' then text = text .. (' %.1fs'):format(e.elapsed) end
          mark(row, 0, { virt_text = { { text, group } }, virt_text_pos = 'right_align' })
        else
          for _, line in ipairs(event_lines(e, icons)) do span(add(line), line, event_hl[e.level]) end
        end
        i = i + 1
      end
      -- a blank line separates a tool/event run from a following message
      if i <= n and entries[i].kind == 'message' then add('') end
    end
  end

  if opts.stream then
    if n > 0 and entries[n].kind ~= 'message' then add('') end
    local e = { role = 'assistant', model = M.short_model(opts.stream_model) }
    message(e, message_header(e, true), opts.stream, true)
  end
  return { lines = lines, marks = marks, groups = groups, messages = messages }
end

return M
