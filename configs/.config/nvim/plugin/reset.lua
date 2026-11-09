-- :Reset  -> close every buffer that can be closed safely; keep buffers with unsaved
--            changes and terminals with a running job.
-- :RESET  -> (or :Reset!) yeet everything: discard changes, kill terminals, no questions.
-- Both collapse the layout to a single tab with a single window.

local function has_changes(buf)
  if vim.bo[buf].modified then
    return true
  end
  if vim.bo[buf].buftype == 'terminal' then
    local chan = vim.bo[buf].channel
    return chan > 0 and vim.fn.jobwait({ chan }, 0)[1] == -1 -- -1 = still running
  end
  return false
end

local function reset(force)
  -- Leave insert/terminal mode and any floating window first
  vim.cmd('stopinsert')
  for _, win in ipairs(vim.api.nvim_list_wins()) do
    if vim.api.nvim_win_get_config(win).relative ~= '' then
      pcall(vim.api.nvim_win_close, win, true)
    end
  end
  pcall(vim.cmd, 'cclose')
  pcall(vim.cmd, 'lclose')

  local closed, kept = 0, {}
  for _, buf in ipairs(vim.api.nvim_list_bufs()) do
    local bt = vim.bo[buf].buftype
    -- Listed buffers, plus help/terminal buffers. Unlisted plugin scratch buffers
    -- (notifications, progress, ...) are left alone.
    if vim.api.nvim_buf_is_valid(buf) and (vim.bo[buf].buflisted or bt == 'help' or bt == 'terminal') then
      if not force and has_changes(buf) then
        local name = vim.api.nvim_buf_get_name(buf)
        table.insert(kept, name ~= '' and vim.fn.fnamemodify(name, ':~:.') or ('[No Name ' .. buf .. ']'))
      elseif pcall(vim.api.nvim_buf_delete, buf, { force = force }) then
        closed = closed + 1
      else
        table.insert(kept, vim.api.nvim_buf_get_name(buf))
      end
    end
  end

  pcall(vim.cmd, 'silent! tabonly!')
  pcall(vim.cmd, 'silent! only!')

  -- Show a kept buffer instead of an empty one, if any remain
  local cur = vim.api.nvim_get_current_buf()
  if vim.api.nvim_buf_get_name(cur) == '' and not vim.bo[cur].modified then
    for _, buf in ipairs(vim.api.nvim_list_bufs()) do
      if buf ~= cur and vim.bo[buf].buflisted then
        vim.api.nvim_set_current_buf(buf)
        break
      end
    end
  end

  local msg = ('Reset: closed %d buffer(s)'):format(closed)
  if #kept > 0 then
    msg = msg .. (', kept %d with changes:\n  %s'):format(#kept, table.concat(kept, '\n  '))
  end
  vim.notify(msg, vim.log.levels.INFO)
end

vim.api.nvim_create_user_command('Reset', function(opts)
  reset(opts.bang)
end, { bang = true, desc = 'Close all clean buffers (! = close everything, discard changes)' })

vim.api.nvim_create_user_command('RESET', function()
  reset(true)
end, { desc = 'Close ALL buffers, discarding changes' })
