-- Per-root layout snapshots (:mksession-style) under
-- stdpath('state')/project-sessions. Files are keyed by sha256(root) (same
-- hashing idiom as lua/ai/session_ids.lua), live in 0700 state, never in the
-- dotfiles repo, and contain absolute buffer paths — treat as private.
--
-- Pruning policy: the filename is content-addressed per root, so "keep the
-- newest N snapshots of one root" reduces to a global LRU cap (default 20),
-- always keeping the just-saved root. Ordering comes from a monotonic epoch
-- recorded in a `.order` sidecar on every save (vim.uv.hrtime(), shared across
-- processes, strictly increasing): this build's `:mksession` writes a coarse
-- cached mtime (same-second writes get byte-identical sec+nsec), so mtime
-- ordering is nondeterministic and unusable.
local M = {}

local function options()
  return require('project').options
end

local function session_dir()
  return options().sessions.dir
end

local function order_file()
  return vim.fs.joinpath(session_dir(), '.order')
end

function M.file_for(root)
  return vim.fs.joinpath(session_dir(), vim.fn.sha256(root) .. '.vim')
end

function M.ensure_dir()
  if vim.fn.isdirectory(session_dir()) == 0 then
    vim.fn.mkdir(session_dir(), 'p', '0700')
  end
end

function M.has(root)
  return root ~= nil and vim.fn.filereadable(M.file_for(root)) == 1
end

-- True when any loaded normal buffer is modified. This holds even with
-- hidden=true: nvim_list_bufs() enumerates real buffers and we filter on the
-- loaded flag, so unsaved work is never clobbered by a restore.
function M.modified()
  for _, buf in ipairs(vim.api.nvim_list_bufs()) do
    if vim.api.nvim_buf_is_loaded(buf)
      and vim.bo[buf].buftype == ''
      and vim.bo[buf].modified then
      return true
    end
  end
  return false
end

function M.save(root)
  if not options().sessions.enabled then return end
  root = root or require('project').current()
  if not root then return end
  M.ensure_dir()
  local file = M.file_for(root)
  vim.cmd('mksession! ' .. vim.fn.fnameescape(file))
  local f = io.open(order_file(), 'a')
  if f then
    f:write(string.format('%020d %s\n', vim.uv.hrtime(), vim.fn.fnamemodify(file, ':t')))
    f:close()
  end
  M.prune(root)
end

-- Restore target's layout, called by the switch pipeline AFTER :cd. Skips
-- (with a warn notify) when any loaded buffer is modified, and re-cds so our
-- root wins over the cwd mksession embedded in the snapshot.
function M.restore(root)
  local cfg = options().sessions
  if not (cfg.enabled and cfg.auto_restore) then return false end
  if not M.has(root) then return false end
  if M.modified() then
    vim.notify('project: session restore skipped (modified buffer)', vim.log.levels.WARN)
    return false
  end
  vim.cmd('source ' .. vim.fn.fnameescape(M.file_for(root)))
  vim.cmd.cd(root)
  return true
end

-- Keep the newest cfg.sessions.prune snapshots by save-order epoch from the
-- `.order` sidecar; the just-saved `keep` file is always kept (it swaps in for
-- the oldest kept snapshot if it would otherwise be evicted). Files with no
-- order entry (legacy) sort as oldest and get re-recorded if kept.
function M.prune(keep)
  local max = options().sessions.prune or 20
  local keepfile = keep and M.file_for(keep)
  local keepname = keepfile and vim.fn.fnamemodify(keepfile, ':t')
  local files = vim.fn.glob(vim.fs.joinpath(session_dir(), '*.vim'), false, true)

  -- load epochs: hash-basename -> monotonic hrtime recorded at save
  local epoch = {}
  local f = io.open(order_file(), 'r')
  if f then
    for line in f:lines() do
      local e, name = line:match('^(%d+)%s+(.+)$')
      if e and name then epoch[name] = tonumber(e) end
    end
    f:close()
  end

  local order = {}
  for _, path in ipairs(files) do
    local name = vim.fn.fnamemodify(path, ':t')
    order[#order + 1] = { name = name, epoch = epoch[name] or 0 }
  end
  table.sort(order, function(a, b)
    if a.epoch ~= b.epoch then return a.epoch > b.epoch end
    return a.name > b.name -- deterministic tiebreak (legacy/unknown epochs)
  end)

  -- keepset = the max newest names
  local keepset = {}
  local kept = {}
  for i = 1, math.min(max, #order) do
    local name = order[i].name
    keepset[name] = true
    kept[#kept + 1] = name
  end
  if keepname and not keepset[keepname] and #kept > 0 then
    -- just-saved snapshot would be evicted: swap it in for the oldest kept
    local old = table.remove(kept, #kept)
    keepset[old] = nil
    keepset[keepname] = true
  end

  for _, item in ipairs(order) do
    if not keepset[item.name] then
      vim.fn.delete(vim.fs.joinpath(session_dir(), item.name))
    end
  end

  -- rewrite the order sidecar to match what remains (ascending epochs)
  local w = io.open(order_file(), 'w')
  if w then
    for i = #order, 1, -1 do
      local name = order[i].name
      if keepset[name] then
        w:write(string.format('%020d %s\n', epoch[name] or 0, name))
      end
    end
    w:close()
  end
end

return M
