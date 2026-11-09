-- Visual-selection jobs (:AIHelp). Pi only proposes replacement text through the replace_selection tool;
-- Neovim applies it to the live buffer, three-way merging with edits made while the job ran.
-- Never steals focus: results are reported with vim.notify and logged to the project view.
local roots = require('ai.project')
local sessions = require('ai.session')
local protocol = require('ai.protocol')
local tools = require('ai.ui.tools')
local profiles = require('ai.profiles')
local M = {}
local ns = vim.api.nvim_create_namespace('ai_help')
local workers = {} -- one Pi process per project root and tier, jobs run FIFO inside it
local jobs = {}    -- every job of this Neovim run, newest last (for review/abort)
local serial = 0
local review_picker_pending = false
local dispatch, finish

local function options() return require('ai.config').options end
local function notify(text, level)
  vim.schedule(function() vim.notify('AI: ' .. text, level or vim.log.levels.INFO) end)
end
local function project_hint() return options().mappings.project or ':AIToggle' end
local function owns(job) return profiles.allows(job.token) end
local function same_token(left, right)
  return type(left) == 'table' and type(right) == 'table'
    and left.name == right.name and left.generation == right.generation
end
local function log(job, text, role)
  if owns(job) then pcall(require('ai.comments').log, job.root, text, role, job.profile_name) end
end

function M.highlights()
  vim.api.nvim_set_hl(0, 'AIHelpPending', { link = 'DiffChange', default = true })
  vim.api.nvim_set_hl(0, 'AIHelpApplied', { link = 'DiffAdd', default = true })
  vim.api.nvim_set_hl(0, 'AIHelpConflict', { link = 'DiffDelete', default = true })
end
M.highlights()

-- Mark range -> (row, col, end_row, end_col), or nil when the buffer/extmark is gone.
-- The mark grows with edits at its edges (inclusive gravity); a whole-line replacement can stretch it
-- onto the start of the next line, so a trailing line break the original did not have is trimmed.
local function range(job)
  if not vim.api.nvim_buf_is_valid(job.buf) then return nil end
  local mark = vim.api.nvim_buf_get_extmark_by_id(job.buf, ns, job.mark, { details = true })
  if not mark[1] then return nil end
  local details = mark[3] or {}
  local sr, sc, er, ec = mark[1], mark[2], details.end_row or mark[1], details.end_col or mark[2]
  if ec == 0 and er > sr and not job.text:match('\n$') then
    er = er - 1
    ec = #(vim.api.nvim_buf_get_lines(job.buf, er, er + 1, false)[1] or '')
  end
  return sr, sc, er, ec
end

local function set_mark(job, hl, label)
  local sr, sc, er, ec = range(job)
  if not sr then return end
  vim.api.nvim_buf_set_extmark(job.buf, ns, sr, sc, {
    id = job.mark, end_row = er, end_col = ec, hl_group = hl, hl_mode = 'combine',
    right_gravity = false, end_right_gravity = true,
    virt_text = label and { { ' ' .. label, 'Comment' } } or nil, virt_text_pos = 'eol',
  })
end

local function drop_mark(job)
  if job.mark and vim.api.nvim_buf_is_valid(job.buf) then pcall(vim.api.nvim_buf_del_extmark, job.buf, ns, job.mark) end
end

local function text_of(buf, sr, sc, er, ec)
  return table.concat(vim.api.nvim_buf_get_text(buf, sr, sc, er, ec, {}), '\n')
end

-- Selection from the command range. Charwise only when the range is exactly the last `v` selection.
local function region(buf, opts)
  local first, last = opts.line1, opts.line2
  local lines = vim.api.nvim_buf_get_lines(buf, first - 1, last, false)
  local vs, ve = vim.fn.getpos("'<"), vim.fn.getpos("'>")
  if opts.range == 2 and vim.fn.visualmode() == 'v' and vs[2] == first and ve[2] == last then
    local pos = vim.fn.getregionpos(vs, ve, { type = 'v' })
    if #pos > 0 then
      -- getregionpos columns are 1-based inclusive; clamp so `v$` does not swallow the line break.
      local scol = math.min(pos[1][1][3] - 1, #lines[1])
      local ecol = math.min(pos[#pos][2][3], #lines[#lines])
      if first ~= last or ecol > scol then
        return { first = first, last = last, scol = scol, ecol = ecol, charwise = true }
      end
    end
  end
  return { first = first, last = last, scol = 0, ecol = #lines[#lines], charwise = false }
end

-- Models sometimes wrap code in fences or add a final newline despite instructions.
local function normalize(original, proposal)
  if not original:match('^%s*```') then
    local body = proposal:match('^%s*```[^\n]*\n(.-)\n```%s*$')
    if body then proposal = body end
  end
  if not original:match('\n$') then proposal = proposal:gsub('\n$', '') end
  return proposal
end

-- Three-way line merge with git merge-file. Returns merged text or nil on conflicts/errors.
function M.merge(base, current, proposal)
  local dir = vim.fn.tempname()
  vim.fn.mkdir(dir, 'p', '0700')
  local files = { current = dir .. '/current', base = dir .. '/base', ai = dir .. '/ai' }
  vim.fn.writefile(vim.split(current, '\n', { plain = true }), files.current)
  vim.fn.writefile(vim.split(base, '\n', { plain = true }), files.base)
  vim.fn.writefile(vim.split(proposal, '\n', { plain = true }), files.ai)
  local ok, result = pcall(function()
    return vim.system({ 'git', 'merge-file', '-p', '-q', files.current, files.base, files.ai }, { text = true }):wait()
  end)
  vim.fn.delete(dir, 'rf')
  if not ok or result.code ~= 0 then return nil end
  return (result.stdout:gsub('\n$', ''))
end

local function flash(buf, sr, sc, replacement)
  local er = sr + #replacement - 1
  local ec = #replacement == 1 and sc + #replacement[1] or #replacement[#replacement]
  local ok, id = pcall(vim.api.nvim_buf_set_extmark, buf, ns, sr, sc,
    { end_row = er, end_col = ec, hl_group = 'AIHelpApplied', hl_mode = 'combine' })
  if ok then vim.defer_fn(function() pcall(vim.api.nvim_buf_del_extmark, buf, ns, id) end, 2000) end
end

local function write(job, sr, sc, er, ec, text)
  local replacement = vim.split(text, '\n', { plain = true })
  local ok, err = pcall(vim.api.nvim_buf_set_text, job.buf, sr, sc, er, ec, replacement)
  if not ok then return false, err end
  drop_mark(job)
  flash(job.buf, sr, sc, replacement)
  return true
end

local function conflict(job, why)
  job.state, job.why = 'conflict', why
  set_mark(job, 'AIHelpConflict', 'AI conflict: :AIHelpReview')
  log(job, 'Conflict: ' .. job.label .. ' (' .. why .. '); proposal kept for :AIHelpReview')
  notify('conflict in ' .. job.label .. ' (' .. why .. ') — :AIHelpReview', vim.log.levels.WARN)
end

-- Never change text under the user's cursor mid-insert: wait for normal/cmdline mode in that buffer.
local function busy(job)
  if vim.api.nvim_get_current_buf() ~= job.buf then return false end
  local mode = vim.api.nvim_get_mode().mode
  return not (mode == 'n' or mode:sub(1, 1) == 'c')
end

local function deliver(job, token)
  if job.token ~= token or not profiles.allows(token) or job.state ~= 'ready' then return end
  if not vim.api.nvim_buf_is_loaded(job.buf) then
    job.state = 'failed'
    log(job, 'Buffer closed before ' .. job.label .. ' finished. Proposal:\n\n```\n' .. job.proposal .. '\n```')
    return notify('buffer closed before ' .. job.label .. ' finished — ' .. project_hint() .. ' has the proposal', vim.log.levels.WARN)
  end
  if busy(job) then
    if not job.waiting then
      local token = job.token
      job.waiting = vim.api.nvim_create_autocmd({ 'ModeChanged', 'BufLeave' }, { callback = function()
        vim.schedule(function()
          if job.token ~= token or not profiles.allows(token) or job.state ~= 'ready' then
            if job.waiting then pcall(vim.api.nvim_del_autocmd, job.waiting); job.waiting = nil end
            return
          end
          if busy(job) then return end
          if job.waiting then pcall(vim.api.nvim_del_autocmd, job.waiting); job.waiting = nil end
          deliver(job, token)
        end)
      end })
    end
    return
  end
  if not vim.bo[job.buf].modifiable then return conflict(job, 'buffer is not modifiable') end
  local sr, sc, er, ec = range(job)
  if not sr or (sr == er and sc == ec and job.text ~= '') then return conflict(job, 'selection was deleted') end
  local current = text_of(job.buf, sr, sc, er, ec)
  local result, how = job.proposal, 'applied'
  if current ~= job.text then
    result, how = M.merge(job.text, current, job.proposal), 'merged with your edits'
    if not result then return conflict(job, 'you edited the same lines') end
  end
  if result == current then
    job.state = 'applied'
    drop_mark(job)
    log(job, 'No change needed: ' .. job.label)
    return notify('no change needed in ' .. job.label)
  end
  local ok, err = write(job, sr, sc, er, ec, result)
  if not ok then return conflict(job, 'could not write: ' .. tostring(err)) end
  job.state = 'applied'
  log(job, 'Applied (' .. how .. '): ' .. job.label)
  notify(how .. ': ' .. job.label .. ' — u in that buffer to undo')
end

finish = function(w, success, reason)
  local job = w.active
  if not job then return end
  w.active = nil
  if job.state == 'aborted' then
    drop_mark(job)
  elseif job.proposal then
    job.proposal = normalize(job.text, job.proposal)
    job.state = 'ready'
    if job.answer then log(job, job.answer, 'Pi') end
    deliver(job, job.token)
  elseif success and not job.error and job.answer then
    job.state = 'answered'
    drop_mark(job)
    log(job, protocol.clip(job.answer, options().limits.response_bytes), 'Pi')
    notify('answer for ' .. job.label .. ' — ' .. project_hint() .. ' to read')
  else
    job.state = 'failed'
    drop_mark(job)
    log(job, 'Failed: ' .. job.label .. ' (' .. (reason or job.error or 'no replacement or answer') .. ')')
    notify('failed ' .. job.label .. ' — ' .. project_hint() .. ' for details', vim.log.levels.WARN)
  end
  local token, next_job = job.token, w.queue[1]
  vim.schedule(function()
    if profiles.allows(token) and same_token(w.token, token) and w.queue[1] == next_job then dispatch(w, token, next_job, true) end
  end)
end

local function record(w, session, event, token)
  if not profiles.allows(token) or w.session ~= session then return end
  local job = w.active
  if not job or job.session ~= session then return end
  if event.type == 'message_end' and event.message and event.message.role == 'assistant' then
    local text = protocol.text(event.message)
    if text ~= '' then job.answer = text end
    local reason = event.message.stopReason
    if reason and reason ~= 'stop' and reason ~= 'toolUse' then job.error = 'assistant stopped: ' .. reason end
  elseif event.type == 'tool_execution_start' then
    if owns(job) then pcall(require('ai.comments').log, job.root, tools.start(session, event), nil, job.profile_name) end
    if event.toolName == 'replace_selection' then w.calls[event.toolCallId or ''] = event.args end
  elseif event.type == 'tool_execution_end' then
    if owns(job) then pcall(require('ai.comments').log, job.root, tools.finish(session, event), nil, job.profile_name) end
    if event.toolName == 'replace_selection' then
      local args = w.calls[event.toolCallId or '']
      if not event.isError and type(args) == 'table' and args.job == job.id and type(args.text) == 'string' then
        job.proposal = args.text
      else
        job.error = 'invalid replace_selection call'
      end
    end
  elseif event.type == 'agent_settled' then
    job.settled = true
    if job.accepted then finish(w, true) end
  elseif event.type == 'extension_ui_request' then
    if vim.tbl_contains({ 'select', 'confirm', 'input', 'editor' }, event.method) then
      sessions.send(session, { type = 'extension_ui_response', id = event.id, cancelled = true })
    end
  elseif event.type == 'extension_error' then
    job.error = 'Pi extension error'
  end
end

local function fail_queue(w, why)
  for _, job in ipairs(w.queue) do
    if job.state == 'queued' then
      job.state = 'failed'
      drop_mark(job)
      log(job, 'Failed: ' .. job.label .. ' (' .. why .. ')')
    end
  end
  if #w.queue > 0 then notify('could not start Pi for selection jobs — ' .. project_hint() .. ' for details', vim.log.levels.ERROR) end
  w.queue = {}
end

local function start(w)
  if w.session or not profiles.allows(w.token) then return end
  local token = w.token
  if not profiles.allows(token) then return end
  w.last_error = nil
  local session
  local function owns_session(value)
    return value and value == w.session and profiles.allows(token)
  end
  local err
  session, err = sessions.start(w.root, 'selection', w.role, {
    on_event = function(s, event) record(w, s, event, token) end,
    on_diagnostic = function(text)
      if session and owns_session(session) then
        pcall(require('ai.comments').log, w.root, text, nil, w.profile_name)
      end
    end,
    on_error = function(s, text)
      if not owns_session(s) then return end
      w.last_error = text
      if w.active then finish(w, false, text) end
    end,
    on_exit = function(s, code, stopping)
      local current_slot = w.session == s
      if current_slot then w.session, w.session_token = nil, nil end
      if current_slot and w.active and profiles.allows(token) then finish(w, false, 'Pi exited (code ' .. code .. ')') end
      if current_slot and w.retiring then w.retiring = false end
      if current_slot and profiles.allows(token) and not s.started then
        fail_queue(w, w.last_error or ('Pi exited during startup (code ' .. code .. ')'))
      elseif current_slot and profiles.allows(token) and #w.queue > 0 and vim.v.exiting == vim.NIL then
        local next_job = w.queue[1]
        vim.schedule(function()
          if profiles.allows(token) and same_token(w.token, token) and w.queue[1] == next_job then dispatch(w, token, next_job, true) end
        end)
      end
    end,
    on_ready = function(s)
      if not owns_session(s) then return end
      w.last_error = nil
      s.started = true
      dispatch(w, token, w.queue[1], true)
    end,
  })
  if not session then
    if profiles.allows(token) then w.last_error = err; fail_queue(w, err) end
    return
  end
  w.session, w.session_token = session, token
end

dispatch = function(w, token, expected_head, strict_head)
  token = token or w.token
  if not profiles.allows(token) or not same_token(w.token, token) or w.active then return end
  while w.queue[1] and w.queue[1].state ~= 'queued' do table.remove(w.queue, 1) end
  if strict_head and w.queue[1] ~= expected_head then return end
  if #w.queue == 0 then return end
  if not w.session or not profiles.allows(w.session_token) then return start(w) end
  if not w.session.ready then return end
  local job = table.remove(w.queue, 1)
  w.active, w.calls, job.state = job, {}, 'running'
  local session, token = w.session, w.session_token
  job.session = session
  local function owns_session() return owns(job) and w.active == job and w.session == session and profiles.allows(token) end
  -- Each job starts from a clean context; the session is ephemeral (--no-session).
  local sent = sessions.send(session, { type = 'new_session' }, function(reset)
    if not owns_session() then return end
    if not reset.success or (reset.data and reset.data.cancelled) then return finish(w, false, 'could not reset Pi context') end
    sessions.check_state(session, function(valid, state_err)
      if not owns_session() then return end
      if not valid then return finish(w, false, state_err or 'Pi state changed after new selection session') end
      local ok = sessions.send(session, { type = 'prompt', message = job.prompt }, function(response)
        if not owns_session() then return end
        if not response.success or (response.data and response.data.disposition == 'handled') then
          return finish(w, false, 'prompt rejected')
        end
        job.accepted = true
        if job.settled then finish(w, true) end
      end)
      if not ok then finish(w, false, 'could not send prompt') end
    end)
  end)
  if not sent then finish(w, false, 'could not reach Pi') end
end

local function worker(root, role)
  local profile = profiles.current()
  local key = profile.name .. '\n' .. root .. '\n' .. role
  workers[key] = workers[key] or { root = root, role = role, profile_name = profile.name, queue = {}, calls = {} }
  workers[key].token = profiles.token()
  return workers[key]
end

function M.command(opts)
  local token = profiles.token()
  if not profiles.allows(token) then return notify('AI profile is transitioning; retry :AIHelp after it completes', vim.log.levels.WARN) end
  local buf = vim.api.nvim_get_current_buf()
  local root, path = roots.for_buffer(buf)
  if not root then return notify('open a project file first', vim.log.levels.WARN) end
  local instruction, bang = vim.trim(opts.args or ''), opts.bang
  if instruction:sub(1, 1) == '!' then bang, instruction = true, vim.trim(instruction:sub(2)) end
  if instruction == '' then return notify('usage: :AIHelp[!] <instruction> (! uses the stronger model)', vim.log.levels.WARN) end
  local config = options().help
  local selected_profile = profiles.current()
  local roles = profiles.help_roles()
  local role = bang and roles.bang_role or roles.role
  local r = region(buf, opts)
  local text = text_of(buf, r.first - 1, r.scol, r.last - 1, r.ecol)
  if #text > config.selection_bytes then return notify('selection too large for :AIHelp', vim.log.levels.WARN) end
  serial = serial + 1
  local relative = path:sub(#root + 2)
  local job = vim.tbl_extend('force', r, {
    id = 'sel-' .. serial, buf = buf, root = root, role = role, token = token, profile_name = selected_profile.name,
    text = text, instruction = instruction, relative = relative, filetype = vim.bo[buf].filetype, state = 'queued',
    label = relative .. ':' .. r.first .. (r.last ~= r.first and ('-' .. r.last) or ''),
  })
  job.prompt = require('ai.prompts').selection(job, vim.api.nvim_buf_get_lines(buf, 0, -1, false), config.context_lines)
  job.mark = vim.api.nvim_buf_set_extmark(buf, ns, r.first - 1, r.scol, {
    end_row = r.last - 1, end_col = r.ecol, hl_group = 'AIHelpPending', hl_mode = 'combine',
    right_gravity = false, end_right_gravity = true,
    virt_text = { { ' AI (' .. role .. ') working…', 'Comment' } }, virt_text_pos = 'eol',
  })
  jobs[#jobs + 1] = job
  local w = worker(root, role)
  w.queue[#w.queue + 1] = job
  log(job, 'Selection job ' .. job.label .. ' [' .. role .. ']: ' .. instruction:sub(1, 200))
  dispatch(w)
end

local function close_review(tab, job)
  if job and job.review_tabs then job.review_tabs[tab] = nil end
  if vim.api.nvim_tabpage_is_valid(tab) then
    if #vim.api.nvim_list_tabpages() > 1 then
      vim.cmd('tabclose ' .. vim.api.nvim_tabpage_get_number(tab))
    end
  end
end

local function review(job)
  if not owns(job) then return end
  local current = ''
  local sr, sc, er, ec = range(job)
  if sr then current = text_of(job.buf, sr, sc, er, ec) end
  vim.cmd('tabnew')
  local tab = vim.api.nvim_get_current_tabpage()
  job.review_tabs = job.review_tabs or {}
  job.review_tabs[tab] = true
  local function scratch(name, text, modifiable)
    local b = vim.api.nvim_get_current_buf()
    vim.bo[b].buftype, vim.bo[b].bufhidden, vim.bo[b].swapfile = 'nofile', 'wipe', false
    vim.api.nvim_buf_set_lines(b, 0, -1, false, vim.split(text, '\n', { plain = true }))
    vim.bo[b].filetype = job.filetype
    vim.bo[b].modifiable = modifiable
    pcall(vim.api.nvim_buf_set_name, b, ('ai://%s/review/%s/%s'):format(job.profile_name, name, job.id))
    vim.cmd('diffthis')
    return b
  end
  scratch('current', current, false)
  vim.cmd('vnew')
  local proposal = scratch('proposal', job.proposal, true)
  vim.wo.winbar = ' AI proposal for ' .. job.label .. '  ga: apply (replaces current)  gx: discard  q: close'
  local function review_is_current()
    return owns(job) and job.state == 'conflict' and job.review_tabs and job.review_tabs[tab]
      and vim.api.nvim_tabpage_is_valid(tab)
  end
  local function apply()
    if not review_is_current() then
      return vim.notify('AI: this proposal no longer belongs to an active selection review', vim.log.levels.WARN)
    end
    local text = table.concat(vim.api.nvim_buf_get_lines(proposal, 0, -1, false), '\n')
    local r1, c1, r2, c2 = range(job)
    if not r1 then return vim.notify('AI: original buffer or position is gone', vim.log.levels.ERROR) end
    local ok, err = write(job, r1, c1, r2, c2, text)
    if not ok then return vim.notify('AI: could not apply: ' .. tostring(err), vim.log.levels.ERROR) end
    job.state = 'applied'
    log(job, 'Applied from review: ' .. job.label)
    close_review(tab, job)
  end
  vim.keymap.set('n', 'ga', apply, { buffer = proposal, desc = 'Apply AI proposal' })
  vim.keymap.set('n', 'gx', function()
    if not review_is_current() then
      return vim.notify('AI: this proposal no longer belongs to an active selection review', vim.log.levels.WARN)
    end
    job.state = 'discarded'
    drop_mark(job)
    close_review(tab, job)
  end, { buffer = proposal, desc = 'Discard AI proposal' })
  vim.keymap.set('n', 'q', function() close_review(tab, job) end, { buffer = proposal, desc = 'Close review' })
end

function M.review()
  local token = profiles.token()
  if not profiles.allows(token) then return notify('AI profile is transitioning; retry :AIHelpReview after it completes', vim.log.levels.WARN) end
  local active = profiles.current().name
  local pending = {}
  for i = #jobs, 1, -1 do
    if jobs[i].profile_name == active and jobs[i].state == 'conflict' then pending[#pending + 1] = jobs[i] end
  end
  if #pending == 0 then return vim.notify('AI: no conflicting selection jobs') end
  if #pending == 1 then return review(pending[1]) end
  review_picker_pending = true
  vim.ui.select(pending, {
    prompt = 'AI conflicts',
    format_item = function(job) return job.label .. ' — ' .. job.instruction:sub(1, 60) end,
  }, function(job)
    review_picker_pending = false
    if profiles.allows(token) and job then review(job) end
  end)
end

function M.abort()
  if not profiles.allows(profiles.token()) then return notify('AI profile is transitioning; retry :AIHelpAbort after it completes', vim.log.levels.WARN) end
  local active = profiles.current().name
  local count = 0
  for _, job in ipairs(jobs) do
    if job.profile_name == active and (job.state == 'queued' or job.state == 'running' or job.state == 'ready') then
      job.state = 'aborted'
      drop_mark(job)
      count = count + 1
    end
  end
  for _, w in pairs(workers) do
    if w.profile_name == active and w.active and w.session then sessions.send(w.session, { type = 'abort' }) end
  end
  vim.notify('AI: aborted ' .. count .. ' selection job(s)')
end

function M.model(opts)
  if not profiles.allows(profiles.token()) then return notify('AI profile is transitioning; retry :AIHelpModel after it completes', vim.log.levels.WARN) end
  local roles = profiles.help_roles()
  local role = vim.trim(opts.args or '')
  if role == '' then
    return vim.notify('AI: :AIHelp uses ' .. roles.role .. ', :AIHelp! uses ' .. roles.bang_role)
  end
  local updated, err
  if opts.bang then updated, err = profiles.set_help_roles(nil, role)
  else updated, err = profiles.set_help_roles(role, nil) end
  if not updated then return vim.notify('AI: ' .. err, vim.log.levels.ERROR) end
  vim.notify('AI: :AIHelp' .. (opts.bang and '!' or '') .. ' now uses ' .. role)
end

function M.tiers()
  return { 'chat', 'cheap', 'expensive' }
end

function M.busy_reason()
  if review_picker_pending then return 'selection conflict picker is open' end
  for _, w in pairs(workers) do
    if w.active or #w.queue > 0 then return 'selection jobs are active or queued' end
    if w.session and (not w.session.ready or w.session.client.stopping) then return 'selection Pi session is connecting or exiting' end
  end
  for _, job in ipairs(jobs) do
    for tab in pairs(job.review_tabs or {}) do
      if vim.api.nvim_tabpage_is_valid(tab) then return 'selection review is open' end
    end
    if job.state == 'queued' or job.state == 'running' or job.state == 'ready' or job.state == 'conflict' then
      return 'a selection proposal is unresolved'
    end
  end
end

function M.retire()
  for _, w in pairs(workers) do
    if w.session then w.retiring = true; sessions.stop(w.session) end
  end
end

-- Test/introspection hooks.
M._jobs, M._workers, M._ns = jobs, workers, ns

return M
