-- Integration-ish tests for the project.switch pipeline: normalize, no-op
-- guard, ProjectSwitchPre/Post event data, veto via abort_switch, cd_only,
-- and the zoxide rank bump (against an isolated DB).
-- Run: nvim --headless -u NONE -l tests/project_switch.lua
vim.opt.rtp:append(vim.fn.getcwd())

local tmp = vim.fn.tempname()
require('project').setup({
  zoxide = { data_dir = tmp .. '/db' },
  sessions = { dir = tmp .. '/sessions' },
  notify = false,
})
local project = require('project')
local z = require('project.zoxide')

local function eq(a, b)
  assert(a == b, string.format('expected %s (%s), got %s (%s)', tostring(b), type(b), tostring(a), type(a)))
end

local rootA = tmp .. '/repoA'
local rootB = tmp .. '/repoB'
local plain = tmp .. '/plain'
vim.fn.mkdir(rootA .. '/sub', 'p')
vim.fn.mkdir(rootB, 'p')
vim.fn.mkdir(plain, 'p')
vim.fn.writefile({}, rootA .. '/.git')
vim.fn.writefile({}, rootB .. '/.git')

local events = {}
vim.api.nvim_create_autocmd('User', { pattern = 'ProjectSwitchPre', callback = function(ev) events[#events + 1] = { 'pre', ev.data.old, ev.data.new } end })
vim.api.nvim_create_autocmd('User', { pattern = 'ProjectSwitchPost', callback = function(ev) events[#events + 1] = { 'post', ev.data.old, ev.data.new, ev.data.session_restored } end })

vim.cmd.cd(rootA)
eq(project.current(), rootA)

-- full switch into repoB (trailing slash normalizes); event data carries realpaths
assert(project.switch(rootB .. '/'))
eq(project.current(), rootB)
eq(#events, 2)
eq(events[1][1], 'pre'); eq(events[1][2], rootA); eq(events[1][3], rootB)
eq(events[2][1], 'post'); eq(events[2][2], rootA); eq(events[2][3], rootB); eq(events[2][4], false)

-- no-op guard: same effective root fires no events
assert(project.switch(rootB) == false)
eq(#events, 2)

-- normalize_root lifts a subdir up to its git root
assert(project.switch(rootA .. '/sub'))
eq(project.current(), rootA)
eq(events[3][3], rootA) -- pre.new for the third switch is the normalized root

-- a plain (non-repo) dir switches without normalization
assert(project.switch(plain))
eq(project.current(), plain)

-- cd_only is a literal :cd: no events, no rank, no normalize
local n = #events
assert(project.switch(rootB, { cd_only = true }))
eq(project.current(), rootB)
eq(#events, n)

-- rank bump: every full switch adds the (normalized) target to the DB,
-- including the plain dir; cd_only added nothing new (repoB already there)
local seen = {}
for _, e in ipairs(z.list()) do seen[e.path] = true end
assert(seen[rootA] and seen[rootB] and seen[plain], 'rank bump missing an entry')

-- veto: a ProjectSwitchPre listener aborts the pipeline before :cd
local n0 = #events
vim.api.nvim_create_autocmd('User', { pattern = 'ProjectSwitchPre', callback = function() project.abort_switch() end })
assert(project.switch(rootA) == false)
eq(project.current(), rootB) -- cwd untouched
eq(#events, n0 + 1)           -- pre fired, no post

-- unknown target is a hard nil, not a switch
assert(project.switch(tmp .. '/missing') == nil)

print('project switch tests passed')
