-- Git root detection + repo metadata for root normalization and the picker
-- preview ("↑ inside <repo>" marker teaches the user to pick roots, not rows).
local M = {}

-- Nearest ancestor (bounded, default depth 8) containing a `.git` dir, a
-- `.git` file (worktrees/submodules), or a `HEAD` marker (bare repos).
-- Returns the root path or nil.
function M.nearest(start, depth)
  depth = depth or 8
  local dir = start and vim.uv.fs_realpath(start) or vim.uv.fs_realpath(vim.fn.getcwd())
  if not dir then return nil end
  for _ = 1, depth do
    if vim.uv.fs_stat(vim.fs.joinpath(dir, '.git'))
      or vim.uv.fs_stat(vim.fs.joinpath(dir, 'HEAD')) then
      return dir
    end
    local parent = vim.fs.dirname(dir)
    if not parent or parent == dir then return nil end
    dir = parent
  end
  return nil
end

local function capture(...)
  local result = vim.system({ ... }, { text = true }):wait()
  return result.code, result.stdout or ''
end

-- { root, branch, dirty } for the repo containing `path`, or nil when `path`
-- is not inside any repo. Used by the picker preview/statusline (optional).
function M.meta(path)
  local dir = path or vim.fn.getcwd()
  local code, root = capture('git', '-C', dir, 'rev-parse', '--show-toplevel')
  if code ~= 0 then return nil end
  root = vim.trim(root)
  local _, branch = capture('git', '-C', dir, 'branch', '--show-current')
  local _, porcelain = capture('git', '-C', dir, 'status', '--porcelain')
  return {
    root = root ~= '' and root or nil,
    branch = vim.trim(branch) ~= '' and vim.trim(branch) or nil,
    dirty = vim.trim(porcelain) ~= '',
  }
end

function M.is_repo(path)
  local real = vim.uv.fs_realpath(path or vim.fn.getcwd())
  return real ~= nil and M.nearest(real, 1) == real
end

return M
