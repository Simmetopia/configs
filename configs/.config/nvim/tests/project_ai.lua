-- Opt-in AI integration tests: ProjectSwitchPost re-targets ai.project, the
-- comments' current() trap rule resolves to the switched root, the buffer root
-- wins for an unrelated project, and prune_others / stop_all behave as
-- specified. Never spawns pi (no session starts).
-- Run: PATH="$PWD/tests/bin:$PATH" nvim --headless -u NONE -l tests/project_ai.lua
vim.opt.rtp:append(vim.fn.getcwd())

local tmp = vim.fn.tempname()
require('project').setup({
  zoxide = { data_dir = tmp .. '/db' },
  sessions = { dir = tmp .. '/sessions' },
  notify = false,
})
require('ai').setup() -- registers the ProjectSwitchPost hook (integrate = true)

local roots = require('ai.project')
local comments = require('ai.comments')
local project = require('project')
local view = require('ai.ui.view')

local function eq(a, b)
  assert(a == b, string.format('expected %s (%s), got %s (%s)', tostring(b), type(b), tostring(a), type(a)))
end
local function contains(t, needle)
  for _, v in ipairs(t) do if v == needle then return true end end
  return false
end

local rootA = tmp .. '/repoA'
local rootB = tmp .. '/repoB'
local rootC = tmp .. '/repoC'
vim.fn.mkdir(rootA, 'p'); vim.fn.mkdir(rootB, 'p'); vim.fn.mkdir(rootC, 'p')
vim.fn.writefile({}, rootA .. '/.git'); vim.fn.writefile({}, rootB .. '/.git'); vim.fn.writefile({}, rootC .. '/.git')

-- watch which roots comments.current() hands to project() -> view.new
local created = {}
local orig_new = view.new
view.new = function(root, ...) created[#created + 1] = root; return orig_new(root, ...) end

vim.cmd.cd(rootA)
local fileA = rootA .. '/main.py'
vim.fn.writefile({ 'x = 1 # AI! seed' }, fileA)
vim.cmd.edit(fileA)
eq(roots.current(), rootA)

-- full switch to rootB while the buffer still points at rootA's file (the trap)
assert(project.switch(rootB))
eq(require('ai.project').selected(), rootB)

-- comments.current() must honor the switch: creates the rootB project, not rootA
local before = #created
comments.status()
assert(#created == before + 1, 'switch should create exactly one project')
eq(created[#created], rootB)

-- opening an UNRELATED project's file wins over the sticky override
local fileC = rootC .. '/other.py'
vim.fn.writefile({ 'y = 1' }, fileC)
vim.cmd.edit(fileC)
eq(roots.current(), rootC)
before = #created
comments.status()
eq(created[#created], rootC)
assert(#created == before + 1, 'new project buffer should create a new project')

local function new_project_count()
  return #created
end

-- reset the ai.project re-target so comments falls back to buffer roots
roots.select(nil, nil)
vim.cmd.edit(fileA)
before = #created
comments.status()
eq(created[#created], rootA, 'buffer root should win after clearing selection')
eq(#created, before + 1, 'project A should now be resident')

-- resident projects at this point: rootA, rootB, rootC

-- stop_all(rootB): stops everything except rootB but keeps the map resident
local c1 = new_project_count()
comments.stop_all(rootB)
comments.status() -- rootB stays
eq(new_project_count(), c1, 'stop_all must not drop resident projects')
assert(#created > 0)

-- prune_others(rootB): drops A and C from the map, hides their views
local pruned = {}
local orig_hide = view.hide
view.hide = function(v) pruned[#pruned + 1] = v; return orig_hide(v) end
comments.prune_others(rootB)
assert(#pruned == 2, 'prune_others should hide two non-keep projects')
view.hide = orig_hide

-- A is no longer resident: opening it re-creates the project
before = #created
vim.cmd.edit(fileA)
comments.status()
eq(#created, before + 1, 'pruned project should be re-created on demand')
eq(created[#created], rootA)

view.new = orig_new
print('project AI tests passed')
