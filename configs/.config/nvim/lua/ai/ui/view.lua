-- A view owns buffers/windows only. Workflows provide status, stream and submit callbacks.
local markdown = require('ai.ui.markdown')
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

function M.new(root, title, help, status, stream, submit)
  local view = { root = root, title = title, help = help, status = status, stream = stream, submit = submit, log = {} }
  views[view] = true
  return view
end

function M.append(view, text)
  for line in (text .. '\n'):gmatch('(.-)\n') do view.log[#view.log + 1] = line end
  while #view.log > require('ai.config').options.limits.history_lines do table.remove(view.log, 1) end
end

function M.message(view, role, text)
  M.append(view, markdown.message(role, text))
end

function M.render(view)
  if not view.buf or not vim.api.nvim_buf_is_valid(view.buf) then return end
  local lines = { view.title .. '  ' .. view.root, view.status(), view.help, '' }
  vim.list_extend(lines, view.log)
  local stream = view.stream()
  if stream ~= '' then vim.list_extend(lines, vim.split(markdown.message('Pi (responding)', stream), '\n', { plain = true })) end
  -- Follow new output only while the reader is already at the bottom.
  local follow = valid(view.win) and vim.api.nvim_win_get_cursor(view.win)[1] >= vim.api.nvim_buf_line_count(view.buf)
  vim.bo[view.buf].modifiable = true
  vim.api.nvim_buf_set_lines(view.buf, 0, -1, false, lines)
  vim.bo[view.buf].modifiable = false
  markdown.decorate(view.buf, lines)
  if follow then vim.api.nvim_win_set_cursor(view.win, { #lines, 0 }) end
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
    vim.bo[view.buf].bufhidden = 'hide'
    vim.keymap.set('n', 'q', function() M.hide(view) end, { buffer = view.buf })
    vim.keymap.set('n', 'i', function() M.input(view) end, { buffer = view.buf })
  end
  local width, height, row, col = geometry()
  view.win = vim.api.nvim_open_win(view.buf, true, {
    relative = 'editor', row = row, col = col, width = width, height = height,
    style = 'minimal', border = require('ai.config').options.ui.border, title = ' ' .. view.title .. ' ',
  })
  markdown.setup(view.buf, view.win)
  M.render(view)
  vim.api.nvim_win_set_cursor(view.win, { vim.api.nvim_buf_line_count(view.buf), 0 })
  return true
end

return M
