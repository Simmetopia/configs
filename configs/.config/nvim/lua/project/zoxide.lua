-- Thin, UI-agnostic CLI bridge to zoxide. All reads go through
-- require('project').options (set by setup()) so tests and the picker can
-- point _ZO_DATA_DIR at an isolated DB without touching the user's frecency.
local M = {}

local function options()
  return require('project').options
end

local function realpath(path)
  return vim.uv.fs_realpath(path) or path
end

-- Runs `zoxide <args...>` capturing stdout. Accepts optional { cwd = ... } so
-- callers (e.g. tests) can run against a scratch working directory.
-- env is inherited from vim's env and extended with _ZO_DATA_DIR when the user
-- configured an isolated DB.
function M.capture(args, opts)
  args = args or {}
  local z = options().zoxide
  local call = { text = true }
  if z.data_dir then
    call.env = vim.tbl_extend('keep', { _ZO_DATA_DIR = z.data_dir }, vim.env)
  end
  if opts and opts.cwd then call.cwd = opts.cwd end
  local cmd = { z.bin }
  vim.list_extend(cmd, args)
  local result = vim.system(cmd, call):wait()
  return result.code, result.stdout or '', result.stderr or ''
end

-- Keeps the zoxide-stored spelling unless the user asked for canonical paths.
-- Used to dedupe picker entries (symlinked/subdir entries collide by realpath).
function M.resolve(path)
  local real = vim.uv.fs_realpath(path)
  if options().zoxide.resolve_symlinks then return real or path end
  return path
end

-- Plain substring match against config.zoxide.exclude.
local function excluded(path, patterns)
  for _, p in ipairs(patterns or {}) do
    if path:find(p, 1, true) then return true end
  end
  return false
end

-- zoxide query -l -s prints 175 lines like " 152.0 /home/..." (score, space,
-- path). Returns { { path, score } } ordered by score desc, with config
-- excludes and stat-deleted dirs filtered, deduped by canonical path.
function M.list(terms)
  local args = { 'query', '-l', '-s' }
  if terms and #terms > 0 then vim.list_extend(args, terms) end
  local code, out = M.capture(args)
  if code ~= 0 then return {} end
  local z = options().zoxide
  local entries, seen = {}, {}
  for line in (out or ''):gmatch('[^\r\n]+') do
    -- NOTE: the spec shows `^(%s*(%d+%.?%d*)%s+)(.+)$` but that nested group
    -- captures the score twice, so `match` would return score, score, path and
    -- the path would land on the score. Use an outer, non-nested pattern instead.
    local score, path = line:match('^%s*(%d+%.?%d*)%s+(.+)$')
    if score and path then
      path = M.resolve(path)
      local canon = realpath(path)
      if not excluded(path, z.exclude)
        and vim.uv.fs_stat(path)
        and canon
        and not seen[canon] then
        seen[canon] = true
        entries[#entries + 1] = { path = path, score = tonumber(score) }
      end
    end
  end
  -- zoxide already sorts by frecency; sort defensively so callers can rely on it.
  table.sort(entries, function(a, b) return a.score > b.score end)
  return entries
end

function M.add(...)
  local args = { 'add' }
  for _, p in ipairs({ ... }) do args[#args + 1] = tostring(p) end
  return M.capture(args)
end

function M.remove(...)
  local args = { 'remove' }
  for _, p in ipairs({ ... }) do args[#args + 1] = tostring(p) end
  return M.capture(args)
end

return M
