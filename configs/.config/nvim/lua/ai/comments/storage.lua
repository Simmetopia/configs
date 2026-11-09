-- Only handled marker fingerprints are stored here; never prompts or credentials.
local M = {}
local handled_by_root = {}

local function canonical(root)
  return vim.uv.fs_realpath(root) or vim.fs.normalize(vim.fn.fnamemodify(root, ':p'))
end

local function filename(root)
  root = canonical(root)
  -- Preserve the old state directory to avoid replaying handled requests.
  return vim.fn.stdpath('state') .. '/ai-comments/' .. vim.fn.sha256(root) .. '.json'
end

function M.load(root)
  root = canonical(root)
  if handled_by_root[root] then return handled_by_root[root] end
  local path = filename(root)
  local seen = {}
  if vim.fn.filereadable(path) == 1 then
    local ok, hashes = pcall(vim.json.decode, table.concat(vim.fn.readfile(path), '\n'))
    if ok and type(hashes) == 'table' then
      for _, hash in ipairs(hashes) do
        if type(hash) == 'string' and hash:match('^%x+$') then seen[hash] = true end
      end
    end
  end
  handled_by_root[root] = seen
  return seen
end

function M.remember(project, key)
  if key:match('^manual%-') then return end
  project.handled[key] = true
  local keys = vim.tbl_keys(project.handled)
  if #keys > require('ai.config').options.limits.handled_markers then return end
  vim.fn.mkdir(vim.fn.fnamemodify(filename(project.root), ':h'), 'p', '0700')
  local ok = pcall(vim.fn.writefile, { vim.json.encode(keys) }, filename(project.root))
  if not ok then vim.notify('AI: Could not persist handled-marker history.', vim.log.levels.WARN) end
end

return M
