-- Run: tests/run_ai.sh (uses the fake Pi in tests/bin; no network)
vim.opt.rtp:append(vim.fn.getcwd())
vim.fn.delete(vim.env.AI_TEST_LOG)
vim.g.mapleader = ' '
require('ai').setup(dofile('tests/fixtures/ai_setup.lua').options({ comments = { enabled = false } }))
local help = require('ai.help')
local session = require('ai.session')
local root = vim.uv.fs_realpath(vim.fs.root(0, '.git') or vim.fn.getcwd())

local args = session.args(root, 'selection', 'cheap')
assert(vim.tbl_contains(args, '--no-session') and not vim.tbl_contains(args, '--session-id'))
assert(table.concat(args, ' '):find('--tools read,grep,find,ls,replace_selection', 1, true))

local path = vim.fn.getcwd() .. '/ai_help_test_' .. vim.uv.hrtime() .. '.lua'
local function cleanup() pcall(vim.fn.delete, path) end
local ok, err = xpcall(function()
  vim.fn.writefile({ 'one', 'two', 'three', 'four', 'five' }, path)
  vim.cmd('edit ' .. vim.fn.fnameescape(path))
  local buf = vim.api.nvim_get_current_buf()
  local function lines() return vim.api.nvim_buf_get_lines(buf, 0, -1, false) end
  local function set(l) vim.api.nvim_buf_set_lines(buf, 0, -1, false, l) end
  local function last() return help._jobs[#help._jobs] end
  local function wait(job, state)
    assert(vim.wait(10000, function() return job.state == state end, 10),
      ('job %s: expected %s, got %s (%s)'):format(job.id, state, job.state, tostring(job.why)))
  end
  local profiles = require('ai.profiles')
  local function switch(name)
    local done, success = false, nil
    assert(profiles.switch(name, function(ok) done, success = true, ok end))
    assert(vim.wait(7000, function() return done end, 10), 'profile switch timed out')
    assert(success, 'profile switch failed')
    assert(vim.wait(7000, function() return require('ai.rpc').is_idle() end, 10), 'retired Pi clients did not exit')
  end
  local function log_entries()
    local out = {}
    for _, line in ipairs(vim.fn.readfile(vim.env.AI_TEST_LOG)) do
      local e = vim.json.decode(line)
      if e.mode == 'selection' then out[#out + 1] = e end
    end
    return out
  end
  local function marks() return #vim.api.nvim_buf_get_extmarks(buf, help._ns, 0, -1, {}) end

  -- 1. Linewise, default tier luna, single undo step, buffer not saved.
  vim.cmd('2,3AIHelp UPPER')
  local job = last()
  wait(job, 'applied')
  assert(vim.deep_equal(lines(), { 'one', 'TWO', 'THREE', 'four', 'five' }), vim.inspect(lines()))
  assert(vim.bo[buf].modified and vim.fn.readfile(path)[2] == 'two', 'must not write the file')
  local entry = log_entries()[1]
  assert(entry.model == 'gpt-6-luna-2026-09-22', entry.model)
  assert(entry.message:find('Job: ' .. job.id, 1, true) and entry.message:find('unsaved changes', 1, true))
  assert(entry.message:find('<<<SELECTION\ntwo\nthree\nSELECTION>>>', 1, true))
  assert(entry.message:find('1: one', 1, true) and entry.message:find('4: four', 1, true))
  vim.cmd('silent undo')
  assert(vim.deep_equal(lines(), { 'one', 'two', 'three', 'four', 'five' }), 'one undo reverts the AI change')
  vim.wait(2100, function() return marks() == 0 end, 20)
  assert(marks() == 0, 'pending/flash marks cleaned up')

  -- 2. Bang and leading '!' use the expensive role.
  vim.cmd('2AIHelp! UPPER')
  wait(last(), 'applied')
  vim.cmd('3AIHelp !UPPER')
  wait(last(), 'applied')
  local entries = log_entries()
  assert(entries[2].model == 'eu.anthropic.claude-opus-5-5' and entries[3].model == 'eu.anthropic.claude-opus-5-5')
  assert(entries[3].message:find('Request: UPPER\n', 1, true), 'leading ! stripped from the instruction')
  assert(vim.deep_equal(lines(), { 'one', 'TWO', 'THREE', 'four', 'five' }))

  -- 3. Runtime model switch.
  vim.cmd('AIHelpModel expensive')
  vim.cmd('1AIHelp UPPER')
  wait(last(), 'applied')
  assert(log_entries()[4].model == 'eu.anthropic.claude-opus-5-5')
  vim.cmd('AIHelpModel cheap')
  assert(require('ai.profiles').help_roles().role == 'cheap')
  pcall(vim.cmd, 'AIHelpModel luna') -- unknown legacy tier: unchanged
  assert(require('ai.profiles').help_roles().role == 'cheap')
  vim.cmd('AIHelpModel! chat')
  assert(require('ai.profiles').help_roles().role == 'cheap', 'bang role update must preserve ordinary help role')
  assert(require('ai.profiles').help_roles().bang_role == 'chat')
  vim.cmd('1AIHelp! UPPER')
  wait(last(), 'applied')
  assert(log_entries()[5].model == 'gpt-6.1-sol-2026-09-29')
  vim.cmd('AIHelpModel! expensive')

  -- 4. Charwise, including multibyte characters.
  set({ 'local x = foo(bar)', 'æøå test' })
  vim.api.nvim_win_set_cursor(0, { 1, 10 })
  vim.cmd('normal! v2l\27')
  vim.cmd("'<,'>AIHelp UPPER")
  wait(last(), 'applied')
  assert(lines()[1] == 'local x = FOO(bar)', lines()[1])
  vim.api.nvim_win_set_cursor(0, { 2, 0 })
  vim.cmd('normal! v2l\27')
  vim.cmd("'<,'>AIHelp UPPER")
  assert(last().text == 'æøå', vim.inspect(last().text))
  wait(last(), 'applied')
  assert(lines()[2] == 'ÆØÅ test', lines()[2])
  -- v$ must not swallow the line break.
  set({ 'abc', 'def' })
  vim.api.nvim_win_set_cursor(0, { 1, 1 })
  vim.cmd('normal! v$\27')
  vim.cmd("'<,'>AIHelp UPPER")
  assert(last().text == 'bc', vim.inspect(last().text))
  wait(last(), 'applied')
  assert(vim.deep_equal(lines(), { 'aBC', 'def' }), vim.inspect(lines()))

  -- 5. User edits while the job runs: drift above + an edit inside merge cleanly.
  set({ 'one', 'two', 'three', 'four', 'five' })
  vim.cmd([[2,4AIHelp REPLACE:TWO\nthree\nfour]])
  job = last()
  vim.api.nvim_buf_set_lines(buf, 0, 0, false, { 'zero' })       -- above the selection
  vim.api.nvim_buf_set_lines(buf, 4, 5, false, { 'FOUR!' })       -- inside, line 'four'
  wait(job, 'applied')
  assert(vim.deep_equal(lines(), { 'zero', 'one', 'TWO', 'three', 'FOUR!', 'five' }), vim.inspect(lines()))

  -- 6. Same line edited by both: conflict, nothing applied, review applies on demand.
  set({ 'one', 'two', 'three' })
  vim.cmd('2AIHelp REPLACE:ai')
  job = last()
  vim.api.nvim_buf_set_lines(buf, 1, 2, false, { 'mine' })
  wait(job, 'conflict')
  assert(vim.deep_equal(lines(), { 'one', 'mine', 'three' }))
  local switched, refusal
  require('ai.profiles').switch('studio', function(ok, why) switched, refusal = ok, why end)
  assert(switched == false and refusal:find('selection proposal is unresolved', 1, true))
  assert(require('ai.profiles').status().active == 'workbench')
  assert(vim.api.nvim_buf_get_extmark_by_id(buf, help._ns, job.mark, {})[1], 'conflict marker stays visible')
  local tabs = #vim.api.nvim_list_tabpages()
  help.review()
  assert(#vim.api.nvim_list_tabpages() == tabs + 1)
  require('ai.profiles').switch('studio', function(ok, why) switched, refusal = ok, why end)
  assert(switched == false and refusal:find('selection review is open', 1, true))
  local proposal = vim.api.nvim_get_current_buf()
  assert(vim.api.nvim_buf_get_lines(proposal, 0, -1, false)[1] == 'ai')
  local stale_discard
  for _, map in ipairs(vim.api.nvim_buf_get_keymap(proposal, 'n')) do
    if map.lhs == 'ga' then map.callback() end
    if map.lhs == 'gx' then stale_discard = map.callback end
  end
  assert(stale_discard, 'review has no discard callback to replay')
  assert(#vim.api.nvim_list_tabpages() == tabs, 'review tab closed')
  assert(vim.deep_equal(lines(), { 'one', 'ai', 'three' }), vim.inspect(lines()))
  assert(job.state == 'applied')
  switch('studio')
  switch('workbench')
  stale_discard()
  assert(job.state == 'applied' and vim.deep_equal(lines(), { 'one', 'ai', 'three' }),
    'stale discard callback changed an applied job after A→B→A')

  -- 7. A discarded review callback cannot apply after switching away from its profile.
  set({ 'one', 'two', 'three' })
  vim.cmd('2AIHelp REPLACE:discard-me')
  job = last()
  vim.api.nvim_buf_set_lines(buf, 1, 2, false, { 'mine' })
  wait(job, 'conflict')
  help.review()
  local stale_proposal = vim.api.nvim_get_current_buf()
  local apply_callback, discard_callback
  for _, map in ipairs(vim.api.nvim_buf_get_keymap(stale_proposal, 'n')) do
    if map.lhs == 'ga' then apply_callback = map.callback end
    if map.lhs == 'gx' then discard_callback = map.callback end
  end
  assert(apply_callback and discard_callback)
  discard_callback()
  assert(job.state == 'discarded')
  switch('studio')
  local before_stale_apply = lines()
  assert(pcall(apply_callback), 'stale review callback must not access a wiped proposal buffer')
  assert(vim.deep_equal(lines(), before_stale_apply), 'stale review callback edited the buffer')
  switch('workbench')

  -- 7b. Discarding the newest of two open reviews must still track the older tab.
  set({ 'one', 'two', 'three' })
  vim.cmd('2AIHelp REPLACE:duplicate-review')
  job = last()
  vim.api.nvim_buf_set_lines(buf, 1, 2, false, { 'mine' })
  wait(job, 'conflict')
  help.review()
  local older_proposal = vim.api.nvim_get_current_buf()
  local older_tab = vim.api.nvim_get_current_tabpage()
  help.review()
  local newer_proposal = vim.api.nvim_get_current_buf()
  local discard_newest
  for _, map in ipairs(vim.api.nvim_buf_get_keymap(newer_proposal, 'n')) do
    if map.lhs == 'gx' then discard_newest = map.callback end
  end
  assert(discard_newest, 'newest duplicate review has no discard callback')
  discard_newest()
  assert(job.state == 'discarded')
  switched, refusal = nil, nil
  require('ai.profiles').switch('studio', function(ok, why) switched, refusal = ok, why end)
  assert(switched == false and refusal:find('selection review is open', 1, true),
    'discarding the newest duplicate must not hide the older open review')
  assert(vim.api.nvim_tabpage_is_valid(older_tab), 'older review tab was lost from switch accounting')
  local close_older
  for _, map in ipairs(vim.api.nvim_buf_get_keymap(older_proposal, 'n')) do
    if map.lhs == 'q' then close_older = map.callback end
  end
  assert(close_older, 'older review has no close callback')
  close_older()
  switch('studio')
  switch('workbench')

  -- 8. Deferred while in insert mode in that buffer.
  set({ 'a', 'b' })
  local real = vim.api.nvim_get_mode
  vim.api.nvim_get_mode = function() return { mode = 'i', blocking = false } end
  vim.cmd('1AIHelp UPPER')
  job = last()
  wait(job, 'ready')
  vim.wait(300)
  assert(job.state == 'ready' and lines()[1] == 'a', 'not applied during insert')
  local delivery_callback
  for _, autocmd in ipairs(vim.api.nvim_get_autocmds({ event = 'ModeChanged' })) do
    if autocmd.id == job.waiting then delivery_callback = autocmd.callback end
  end
  assert(delivery_callback, 'deferred delivery autocmd callback could not be captured')
  vim.api.nvim_get_mode = real
  -- Keep the proposal and extmark available, but make the old job quiescent so
  -- the real coordinator can switch profiles without applying its callback.
  job.state = 'applied'
  switch('studio')
  switch('workbench')
  local gates = vim.env.AI_TEST_PROFILE_DIR .. '/gates'
  vim.fn.mkdir(gates, 'p')
  local acceptance_hold = gates .. '/acceptance.hold'
  vim.fn.writefile({ 'hold' }, acceptance_hold)
  vim.cmd('2AIHelp REPLACE:replacement-line')
  local replacement = last()
  assert(replacement ~= job)
  assert(vim.wait(10000, function() return vim.fn.filereadable(gates .. '/acceptance.arrived') == 1 end, 10),
    'replacement selection did not reach its held acceptance point')
  assert(replacement.state == 'running', 'replacement selection is not active while the old delivery is replayed')
  job.state = 'ready' -- Restore the deferred old proposal to a conflicting delivery-ready state.
  local before_stale_delivery = lines()
  assert(pcall(delivery_callback), 'stale deferred delivery callback must be harmless after A→B→A')
  vim.wait(200)
  assert(job.state == 'ready' and replacement.state == 'running' and vim.deep_equal(lines(), before_stale_delivery),
    'stale deferred delivery callback changed the current buffer or replacement job')
  vim.fn.delete(acceptance_hold)
  assert(vim.wait(10000, function() return vim.fn.filereadable(gates .. '/acceptance.arrived') == 0 end, 10),
    'replacement selection acceptance gate did not release')
  wait(replacement, 'applied')
  assert(lines()[1] == 'a' and lines()[2] == 'replacement-line')

  -- 9. Selection deleted meanwhile: conflict, buffer untouched.
  set({ 'one', 'two', 'three' })
  vim.cmd('2AIHelp REPLACE:z')
  job = last()
  vim.api.nvim_buf_set_lines(buf, 1, 2, false, {})
  wait(job, 'conflict')
  assert(job.why == 'selection was deleted', job.why)
  assert(vim.deep_equal(lines(), { 'one', 'three' }))
  help.abort() -- abort only touches queued/running/ready jobs
  assert(job.state == 'conflict')

  -- 10. Question: answered, buffer unchanged, mark removed. Bad job id: failed.
  set({ 'x' })
  vim.cmd('1AIHelp what is this')
  wait(last(), 'answered')
  assert(lines()[1] == 'x')
  vim.cmd('1AIHelp BADJOB')
  wait(last(), 'failed')
  assert(lines()[1] == 'x')

  -- 10. Fences and a trailing newline from the model are stripped.
  set({ 'a', 'b' })
  vim.cmd('1,2AIHelp FENCE')
  wait(last(), 'applied')
  assert(vim.deep_equal(lines(), { 'A', 'B' }), vim.inspect(lines()))

  -- 11. Two jobs in flight in one buffer keep their own ranges.
  set({ 'a', 'b', 'c', 'd' })
  vim.cmd('1AIHelp UPPER')
  local first = last()
  vim.cmd('4AIHelp REPLACE:D\\nE')
  local second = last()
  wait(first, 'applied'); wait(second, 'applied')
  assert(vim.deep_equal(lines(), { 'A', 'b', 'c', 'D', 'E' }), vim.inspect(lines()))

  -- 12. Abort a queued job: never applied.
  set({ 'q' })
  vim.cmd('1AIHelp UPPER')
  job = last()
  help.abort()
  vim.wait(800)
  assert(job.state == 'aborted', job.state)
  assert(lines()[1] == 'q', lines()[1])
  assert(not vim.api.nvim_buf_get_extmark_by_id(buf, help._ns, job.mark, {})[1], 'pending mark removed')

  -- 13. The mapping leaves ":'<,'>AIHelp " on the command line (no <CR>).
  assert(vim.fn.maparg('<leader>aih', 'x') == ':AIHelp ')
  set({ 'm', 'n' })
  vim.api.nvim_win_set_cursor(0, { 1, 0 })
  vim.api.nvim_feedkeys(vim.keycode('Vj<leader>aihUPPER<CR>'), 'xt', false)
  wait(last(), 'applied')
  assert(vim.deep_equal(lines(), { 'M', 'N' }), vim.inspect(lines()))

  -- 14. Usage error without instruction; no job created.
  local count = #help._jobs
  vim.cmd('1AIHelp')
  vim.cmd('1AIHelp !')
  assert(#help._jobs == count)
end, debug.traceback)
cleanup()
require('ai.rpc').shutdown()
vim.wait(3000, require('ai.rpc').is_idle, 20)
if not ok then
  io.stderr:write(err .. '\n')
  os.exit(1)
end
print('AI help tests passed')
