-- Unit tests for lua/project/sessions.lua: mksession save/restore roundtrip,
-- dirty-buffer guard, per-root snapshot keying, and LRU pruning.
-- Run: nvim --headless -u NONE -l tests/project_sessions.lua
vim.opt.rtp:append(vim.fn.getcwd())

local tmp = vim.fn.tempname()
local dir = tmp .. '/sessions'
require('project').setup({
  zoxide = { data_dir = tmp .. '/db' },
  sessions = { dir = dir, enabled = true, auto_restore = true, prune = 20 },
  notify = false,
})
local sessions = require('project.sessions')

local function eq(a, b)
  assert(a == b, string.format('expected %s (%s), got %s (%s)', tostring(b), type(b), tostring(a), type(a)))
end

local root = tmp .. '/repo'
vim.fn.mkdir(root, 'p')
vim.fn.writefile({}, root .. '/.git')
vim.fn.writefile({ 'hello' }, root .. '/a.txt')

-- save captures a.txt in the layout, keyed by sha256(root), in 0700 state
vim.cmd.edit(root .. '/a.txt')
vim.cmd.write()
sessions.save(root)
assert(sessions.has(root), 'snapshot should exist')
local snapshot = sessions.file_for(root)
assert(vim.fn.filereadable(snapshot) == 1, 'snapshot file readable')
assert(string.match(vim.fn.readfile(snapshot)[1], '^let SessionLoad') ~= nil)

-- restore roundtrip: wipe the buffer list, source the snapshot
vim.cmd('bwipeout! a.txt')
assert(sessions.restore(root), 'restore should succeed')
eq(vim.api.nvim_buf_get_name(0), root .. '/a.txt')

-- dirty guard: any loaded normal buffer modified => skip, return false
vim.cmd('bwipeout!')
vim.fn.writefile({ 'x' }, root .. '/b.txt')
vim.cmd.edit(root .. '/b.txt')
vim.bo.modified = true
assert(not sessions.restore(root), 'dirty buffer must block restore')
eq(vim.bo.modified, true) -- untouched: layout must not clobber unsaved work
vim.bo.modified = false
vim.cmd('bwipeout!')

-- pure LRU prune by mtime, no just-saved protection
vim.fn.writefile({ '1' }, root .. '/z1.txt')
root = nil
local r1, r2, r3 = tmp .. '/r1', tmp .. '/r2', tmp .. '/r3'
vim.fn.mkdir(r1, 'p'); vim.fn.mkdir(r2, 'p'); vim.fn.mkdir(r3, 'p')
sessions.save(r1) -- prune=20 -> no trimming yet
os.execute('sleep 1')
sessions.save(r2)
os.execute('sleep 1')
sessions.save(r3)
require('project').options.sessions.prune = 1
sessions.prune()
local files = vim.fn.glob(dir .. '/*.vim', false, true)
eq(#files, 1) -- only the newest (r3) survives
eq(files[1], sessions.file_for(r3))

-- just-saved protection: saving r1 again keeps r1 even though r3 is newer
sessions.save(r1)
files = vim.fn.glob(dir .. '/*.vim', false, true)
eq(#files, 1)
eq(files[1], sessions.file_for(r1))

print('project sessions tests passed')
