-- Unit tests for lua/project/git.lua (root detection on .git dir / .git file /
-- HEAD marker, bounded upward search, repo metadata).
-- Run: nvim --headless -u NONE -l tests/project_git.lua
vim.opt.rtp:append(vim.fn.getcwd())
require('project').setup({ notify = false })
local git = require('project.git')

local function eq(a, b)
  assert(a == b, string.format('expected %s, got %s', tostring(b), tostring(a)))
end

local tmp = vim.fn.tempname()
-- .git DIRECTORY repo, with a deep src path (real repo so git.meta works)
local repo = tmp .. '/repo'
vim.fn.mkdir(repo .. '/src/app/deep', 'p')
vim.system({ 'git', '-c', 'init.defaultBranch=main', 'init', '-q', repo }, { text = true }):wait()
-- .git FILE (worktree/submodule)
local worktree = tmp .. '/worktree'
vim.fn.mkdir(worktree, 'p')
vim.fn.writefile({ 'gitdir: /nowhere/worktrees/x' }, worktree .. '/.git')
-- bare repo: HEAD marker at the top level
local bare = tmp .. '/bare'
vim.fn.mkdir(bare, 'p')
vim.fn.writefile({ 'ref: refs/heads/main' }, bare .. '/HEAD')
-- plain tree with no markers
local plain = tmp .. '/plain'
vim.fn.mkdir(plain .. '/a/b/c', 'p')

eq(git.nearest(repo .. '/src/app/deep'), repo)
eq(git.nearest(worktree), worktree)
eq(git.nearest(bare), bare)
eq(git.nearest(plain .. '/a/b/c'), nil)

-- is_repo(): resolves against the given path itself, not an ancestor
eq(git.is_repo(repo), true)
eq(git.is_repo(repo .. '/src'), false)
eq(git.is_repo(bare), true)
eq(git.is_repo(plain), false)

-- bounded upward search: deep-only nesting beyond the default depth is nil
local deep = plain
for i = 1, 9 do deep = deep .. '/d' .. i; vim.fn.mkdir(deep, 'p') end
eq(git.nearest(deep), nil)

-- meta() returns root/branch/dirty for a real repo, nil outside any repo
local m = git.meta(repo)
eq(m.root, repo)
assert(m.branch ~= nil and m.branch ~= '', 'repo should report a current branch')
eq(m.dirty, false)
eq(git.meta(plain), nil)

print('project git tests passed')
