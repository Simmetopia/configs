-- Unit tests for lua/project/zoxide.lua against an isolated _ZO_DATA_DIR.
-- Run: nvim --headless -u NONE -l tests/project_zoxide.lua
vim.opt.rtp:append(vim.fn.getcwd())

local tmp = vim.fn.tempname()
local data = tmp .. '/db'
vim.fn.mkdir(data, 'p')
require('project').setup({
  zoxide = { data_dir = data, exclude = {} },
  sessions = { dir = tmp .. '/sessions' },
  notify = false,
})
local z = require('project.zoxide')

local function eq(a, b)
  assert(a == b, string.format('expected %s (%s), got %s (%s)', tostring(b), type(b), tostring(a), type(a)))
end
local function eqset(got, want)
  assert(#got == #want, string.format('entry count expected %d, got %d', #want, #got))
  for _, w in ipairs(want) do
    local found = false
    for _, g in ipairs(got) do if g.path == w then found = true end end
    assert(found, 'missing expected path ' .. w)
  end
end

-- Seed an isolated DB: a repo, a subdir inside it, and a dir that dies after.
local root = tmp .. '/seed-repo'
local nested = root .. '/nested'
local gone = tmp .. '/gone-dir'
vim.fn.mkdir(nested, 'p')
vim.fn.writefile({}, root .. '/.git')
vim.fn.mkdir(gone, 'p')
z.add(root)
z.add(nested)
z.add(gone)
-- gone-dir must not survive list() -> filtered by fs_stat
vim.uv.fs_rmdir(gone)
assert(vim.uv.fs_stat(gone) == nil, 'gone-dir should be gone')

local entries = z.list()
eqset(entries, { root, nested })
for _, e in ipairs(entries) do assert(type(e.score) == 'number', 'score must be numeric') end
-- defensively sorted by score desc
for i = 2, #entries do assert(entries[i - 1].score >= entries[i].score, 'entries out of order') end

-- substring terms narrow the list
local narrow = z.list({ 'nested' })
eqset(narrow, { nested })

-- config.zoxide.exclude is a plain substring match
require('project').options.zoxide.exclude = { nested }
eqset(z.list(), { root })
require('project').options.zoxide.exclude = {}

-- resolve(): default keeps zoxide's spelling; resolve_symlinks=true canonicalizes
local link = tmp .. '/link'
assert(vim.loop.fs_symlink(root, link), 'symlink failed')
eq(z.resolve(link), link)
require('project').options.zoxide.resolve_symlinks = true
eq(z.resolve(link), root)
require('project').options.zoxide.resolve_symlinks = false

-- remove() roundtrip against the isolated DB
z.remove(nested)
eqset(z.list(), { root })

print('project zoxide tests passed')
