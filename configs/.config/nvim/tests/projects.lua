-- Run: nvim --headless -u NONE -l tests/projects.lua
vim.opt.rtp:append(vim.fn.getcwd())
local projects = require('projects')
local root = vim.fn.tempname()
vim.fn.mkdir(root .. '/old', 'p')
vim.fn.mkdir(root .. '/new project', 'p')
root = vim.uv.fs_realpath(root)
local old, new = root .. '/old', root .. '/new project'
local entries = projects.parse(table.concat({
  ' 1.5 ' .. old, ' 1.51 ' .. new, ' 20 ' .. old,
  ' 2 ' .. new, ' 99 ' .. root .. '/missing', 'invalid',
}, '\n'))
assert(#entries == 2)
assert(entries[1].path == old and entries[2].path == new)
assert(entries[2].score == 1.51)
assert(#projects.parse('1.5 ' .. old .. '\n0.9 ' .. new) == 0)
vim.cmd.cd(old)
vim.cmd.enew()
vim.api.nvim_buf_set_lines(0, 0, -1, false, { 'unsaved' })
local calls = {}
local function called(name) calls[name] = (calls[name] or 0) + 1 end
package.loaded['ai.comments'] = { stop_all = function() called('comments') end }
package.loaded['ai.chat'] = { stop_all = function() called('chat') end }
local stopped = false
package.loaded['ai.rpc'] = {
  shutdown = function() called('rpc'); vim.defer_fn(function() stopped = true end, 50) end,
  is_idle = function() return stopped end,
}
package.loaded.overseer = {
  close = function() called('overseer') end,
  list_tasks = function() return { { dispose = function(_, force) assert(force); called('task') end } } end,
}
package.loaded.dap = {
  terminate = function(opts) assert(opts.all); called('dap') end,
  sessions = function() return {} end,
}
projects.register_cleanup('custom', function(ctx)
  assert(ctx.old == old and ctx.new == new)
  called('custom')
end)
projects.setup({ listeners = {
  dap = false,
  overseer = function(ctx)
    assert(ctx.old == old and ctx.new == new)
    called('override')
  end,
  extra = function(ctx)
    assert(ctx.new == new)
    called('extra')
    return function() return stopped end
  end,
} })
assert(vim.fn.exists(':ProjectSwitch') == 2)
vim.api.nvim_create_autocmd('User', { pattern = 'ProjectSwitchPre', callback = function(ev)
  assert(ev.data.old == old and ev.data.new == new)
  called('pre')
end })
vim.api.nvim_create_autocmd('User', { pattern = 'ProjectSwitchPost', callback = function(ev)
  assert(ev.data.old == old and ev.data.new == new)
  assert(stopped)
  called('post')
end })
assert(not projects.switch(new))
assert(not next(calls) and vim.fn.getcwd() == old)
vim.bo.modified = false
local job = vim.fn.jobstart({ 'sh', '-c', 'sleep 60' }, { term = true })
assert(job > 0)
vim.cmd.enew()
assert(projects.switch(new))
assert(vim.fn.getcwd() == new)
for _, name in ipairs({ 'comments', 'chat', 'rpc', 'override', 'extra', 'custom', 'pre', 'post' }) do
  assert(calls[name] == 1, name)
end
assert(not calls.overseer and not calls.task and not calls.dap)
assert(vim.fn.jobwait({ job }, 0)[1] ~= -1)
assert(#vim.fn.getbufinfo({ buflisted = 1 }) == 1)
assert(not projects.switch(root .. '/missing'))
vim.cmd.cd(vim.fn.stdpath('config'))
vim.fn.delete(root, 'rf')
print('Project tests passed')
vim.cmd('qa!')
