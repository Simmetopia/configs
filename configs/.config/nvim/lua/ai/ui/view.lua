-- A view owns buffers/windows only. Workflows provide status, stream and submit callbacks.
local markdown = require('ai.ui.markdown')
local timeline = require('ai.ui.timeline')
local ns = vim.api.nvim_create_namespace('ai_conversation_markdown')
local M = {}
local views = setmetatable({}, { __mode = 'k' })

local function valid(win)
  return win and vim.api.nvim_win_is_valid(win)
end

local function geometry()
  local options = require('ai.config').options.ui
  local width = math.max(1, math.min(math.max(30, math.floor(vim.o.columns * options.width)), vim.o.columns - 4))
  local height = math.max(1, math.min(math.max(8, math.floor(vim.o.lines * options.height)), vim.o.lines - 4))
  return width, height, math.max(0, math.floor((vim.o.lines - height) / 2) - 1), math.max(0, math.floor((vim.o.columns - width) / 2))
end

function M.new(root, title, help, status, stream, submit, owner, stream_model)
  local view = { root = root, title = title, help = help, status = status, stream = stream, submit = submit,
    owner = owner or 'default', stream_model = stream_model, entries_list = {}, index = {}, open = {}, folded = {}, groups = {}, messages = {} }
  views[view] = true
  return view
end

function M.set_submit(view, submit)
  view.submit = submit
end

function M.entries(view)
  return view.entries_list
end

local function trim(view)
  local list, total = view.entries_list, 0
  for _, e in ipairs(list) do total = total + timeline.height(e) end
  local limit = require('ai.config').options.limits.history_lines
  while total > limit and #list > 1 do
    local first = table.remove(list, 1)
    view.index[first.uid] = nil
    total = total - timeline.height(first)
  end
end

function M.add(view, entry)
  if not view.index[entry.uid] then
    view.index[entry.uid] = true
    view.entries_list[#view.entries_list + 1] = entry
    trim(view)
  end
end

function M.hold_history(view, entries)
  if view.history_seen then return end
  view.history_seen, view.held = true, entries
  if #entries > 0 then
    M.event(view, 'info', ('Resumed session — %d earlier messages hidden (H to show)'):format(#entries))
  end
end

function M.show_history(view)
  if not view.held or #view.held == 0 then return end
  local list = view.entries_list
  local at = 0
  for _, e in ipairs(view.held) do
    if not view.index[e.uid] then
      view.index[e.uid] = true
      at = at + 1
      table.insert(list, at, e)
    end
  end
  view.held = nil
  trim(view)
  M.render(view)
end

function M.message(view, role, text, opts)
  M.add(view, timeline.message(vim.tbl_extend('force', opts or {}, { role = role, text = text })))
end

function M.event(view, level, text)
  M.add(view, timeline.event(level, text))
end

local function decorate_border(view)
  local root = vim.fn.fnamemodify(view.root, ':~')
  local title = (' %s · %s '):format(view.title, root)
  local footer = (' %s │ %s '):format(view.status(), view.help)
  if require('ai.config').options.ui.border == 'none' then
    vim.wo[view.win].winbar = (title .. '│' .. footer):gsub('%%', '%%%%')
  else
    vim.api.nvim_win_set_config(view.win, { title = title, footer = footer, footer_pos = 'left' })
  end
end

function M.render(view)
  if not view.buf or not vim.api.nvim_buf_is_valid(view.buf) then return end
  local width = valid(view.win) and vim.api.nvim_win_get_width(view.win) or 80
  local stream = view.stream()
  local result = timeline.render(view.entries_list, { width = width, open = view.open, folded = view.folded, stream = stream ~= '' and stream or nil,
    stream_model = view.stream_model and view.stream_model() or nil })
  local lines = #result.lines > 0 and result.lines or { '' }
  -- Follow new output only while the reader is already at the bottom.
  local follow = valid(view.win) and vim.api.nvim_win_get_cursor(view.win)[1] >= vim.api.nvim_buf_line_count(view.buf)
  vim.bo[view.buf].modifiable = true
  vim.api.nvim_buf_set_lines(view.buf, 0, -1, false, lines)
  vim.bo[view.buf].modifiable = false
  vim.api.nvim_buf_clear_namespace(view.buf, ns, 0, -1)
  for _, m in ipairs(result.marks) do pcall(vim.api.nvim_buf_set_extmark, view.buf, ns, m[1], m[2], m[3]) end
  view.groups, view.messages = result.groups, result.messages
  if valid(view.win) then
    decorate_border(view)
    if follow then vim.api.nvim_win_set_cursor(view.win, { #lines, 0 }) end
  end
end

-- Display-only: leave the workflow, live stream and persisted session untouched.
function M.clear(view)
  view.entries_list, view.index, view.open, view.folded = {}, {}, {}, {}
  M.render(view)
end

-- The fold unit (message or event group) containing a 0-based row.
local function unit_at(view, row)
  for _, g in ipairs(view.groups) do
    if row >= g.row and row <= g.last then return view.open, g.key, g.row, true end
  end
  for _, m in ipairs(view.messages) do
    if row >= m.first and row <= m.last then return view.folded, m.key, m.first, false end
  end
end

local function fold(view, action)
  if action == 'openall' then
    view.folded = {}
    for _, g in ipairs(view.groups) do view.open[g.key] = true end
  elseif action == 'closeall' then
    view.open = {}
    for _, e in ipairs(view.entries_list) do if e.kind == 'message' then view.folded[e.uid] = true end end
  else
    local set, key, first, is_group = unit_at(view, vim.api.nvim_win_get_cursor(0)[1] - 1)
    if not set then return end
    local closed = is_group and not set[key] or not is_group and set[key]
    local want_closed
    if action == 'toggle' then want_closed = not closed else want_closed = action == 'close' end
    set[key] = (want_closed ~= is_group) or nil
    M.render(view)
    if valid(view.win) then vim.api.nvim_win_set_cursor(view.win, { first + 1, 0 }) end
    return
  end
  M.render(view)
end

function M.reset(view)
  view.held, view.history_seen = nil, nil
  M.clear(view)
  if view.input_buf and vim.api.nvim_buf_is_valid(view.input_buf) then
    vim.api.nvim_buf_set_lines(view.input_buf, 0, -1, false, { '' })
  end
end

function M.hide(view)
  if valid(view.input_win) then vim.api.nvim_win_close(view.input_win, true) end
  if valid(view.win) then vim.api.nvim_win_close(view.win, true) end
  view.win, view.input_win = nil, nil
end

local function input_geometry()
  local width, height, row, col = geometry()
  local inset = math.min(2, math.floor((width - 1) / 2))
  local input_height = math.min(2, height)
  return { relative = 'editor', row = row + math.max(0, height - input_height - 2), col = col + inset,
    width = math.max(1, width - inset * 2), height = input_height }
end

function M.resize()
  local width, height, row, col = geometry()
  for view in pairs(views) do
    if valid(view.win) then
      vim.api.nvim_win_set_config(view.win, { relative = 'editor', row = row, col = col, width = width, height = height })
    end
    if valid(view.input_win) then vim.api.nvim_win_set_config(view.input_win, input_geometry()) end
  end
end

function M.input(view)
  if not valid(view.win) then return end
  if valid(view.input_win) then vim.api.nvim_set_current_win(view.input_win); vim.cmd('startinsert'); return end
  if not view.input_buf or not vim.api.nvim_buf_is_valid(view.input_buf) then
    view.input_buf = vim.api.nvim_create_buf(false, true)
    vim.b[view.input_buf].ai_root = view.root
    pcall(vim.api.nvim_buf_set_name, view.input_buf, ('ai://%s/input/%s'):format(view.owner, vim.fn.sha256(view.root)))
    vim.bo[view.input_buf].bufhidden = 'hide'
    vim.bo[view.input_buf].filetype = 'text'
    local function submit()
      local text = vim.trim(table.concat(vim.api.nvim_buf_get_lines(view.input_buf, 0, -1, false), '\n'))
      if text == '' then return end
      -- Clear the draft only after the workflow has accepted it.
      if view.submit(text) == false then return end
      vim.api.nvim_buf_set_lines(view.input_buf, 0, -1, false, { '' })
      vim.cmd('stopinsert')
      if valid(view.input_win) then vim.api.nvim_win_close(view.input_win, true) end
      view.input_win = nil
      if valid(view.win) then vim.api.nvim_set_current_win(view.win) end
    end
    vim.keymap.set('i', '<CR>', submit, { buffer = view.input_buf, desc = 'Send prompt' })
    vim.keymap.set({ 'n', 'i' }, '<C-s>', submit, { buffer = view.input_buf, desc = 'Send multiline prompt' })
    vim.keymap.set('n', '<Esc>', function()
      if valid(view.input_win) then vim.api.nvim_win_close(view.input_win, true) end
      view.input_win = nil
    end, { buffer = view.input_buf })
  end
  view.input_win = vim.api.nvim_open_win(view.input_buf, true, vim.tbl_extend('force', input_geometry(), {
    style = 'minimal', border = require('ai.config').options.ui.border, title = ' Prompt (Enter / Ctrl-S to send) ',
  }))
  vim.cmd('startinsert')
end

function M.toggle(view)
  if valid(view.win) then M.hide(view); return false end
  if not view.buf or not vim.api.nvim_buf_is_valid(view.buf) then
    view.buf = vim.api.nvim_create_buf(false, true)
    vim.b[view.buf].ai_root = view.root
    pcall(vim.api.nvim_buf_set_name, view.buf, ('ai://%s/project/%s'):format(view.owner, vim.fn.sha256(view.root)))
    vim.bo[view.buf].bufhidden = 'hide'
    vim.keymap.set('n', '<C-l>', function() M.clear(view) end, { buffer = view.buf, desc = 'Clear displayed AI history' })
    for _, lhs in ipairs({ 'za', '<Tab>' }) do
      vim.keymap.set('n', lhs, function() fold(view, 'toggle') end, { buffer = view.buf, desc = 'Toggle message or event group' })
    end
    vim.keymap.set('n', 'zc', function() fold(view, 'close') end, { buffer = view.buf, desc = 'Close message or event group' })
    vim.keymap.set('n', 'zo', function() fold(view, 'open') end, { buffer = view.buf, desc = 'Open message or event group' })
    vim.keymap.set('n', 'zR', function() fold(view, 'openall') end, { buffer = view.buf, desc = 'Open all messages and event groups' })
    vim.keymap.set('n', 'zM', function() fold(view, 'closeall') end, { buffer = view.buf, desc = 'Close all messages and event groups' })
    vim.keymap.set('n', 'H', function() M.show_history(view) end, { buffer = view.buf, desc = 'Show held-back history' })
    vim.keymap.set('n', 'q', function() M.hide(view) end, { buffer = view.buf })
    vim.keymap.set('n', 'i', function() M.input(view) end, { buffer = view.buf })
  end
  local width, height, row, col = geometry()
  view.win = vim.api.nvim_open_win(view.buf, true, {
    relative = 'editor', row = row, col = col, width = width, height = height,
    style = 'minimal', border = require('ai.config').options.ui.border,
  })
  markdown.setup(view.buf, view.win)
  M.render(view)
  vim.api.nvim_win_set_cursor(view.win, { vim.api.nvim_buf_line_count(view.buf), 0 })
  return true
end

return M
