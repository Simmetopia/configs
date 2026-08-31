-- Exposes the project's shell scripts as overseer tasks.
--
-- Picks up:
--   * `*.sh` in the project root
--   * anything executable in `scripts/` or `bin/`
--
-- Auto-discovered by overseer because it lives under
-- `<runtimepath>/lua/overseer/template/`.

local files = require('overseer.files')

---Directories scanned, relative to the search dir. '' means the dir itself.
local SUBDIRS = { '', 'scripts', 'bin' }

---@param path string
---@return boolean
local function is_executable(path)
  return vim.fn.executable(path) == 1
end

---@param dir string
---@return string[] Paths relative to `dir`
local function collect_scripts(dir)
  local found = {}
  local seen = {}

  for _, subdir in ipairs(SUBDIRS) do
    local is_root = subdir == ''
    local abs = is_root and dir or vim.fs.joinpath(dir, subdir)
    if vim.fn.isdirectory(abs) == 1 then
      for _, name in ipairs(files.list_files(abs)) do
        local relative = is_root and name or vim.fs.joinpath(subdir, name)
        local full = vim.fs.joinpath(abs, name)
        -- The root is restricted to *.sh so we don't list every stray file;
        -- scripts/ and bin/ exist to hold scripts, so anything runnable counts.
        local wanted = is_root and name:match('%.sh$') ~= nil or is_executable(full)
        if wanted and not seen[relative] then
          seen[relative] = true
          table.insert(found, relative)
        end
      end
    end
  end

  table.sort(found)
  return found
end

---@type overseer.TemplateFileProvider
return {
  cache_key = function(opts)
    return opts.dir
  end,
  generator = function(opts)
    local templates = {}

    for _, relative in ipairs(collect_scripts(opts.dir)) do
      local full = vim.fs.joinpath(opts.dir, relative)
      table.insert(templates, {
        name = relative,
        desc = 'Run ' .. relative,
        tags = { 'RUN' },
        builder = function()
          return {
            -- Fall back to `sh` when the file has no executable bit.
            cmd = is_executable(full) and { full } or { 'sh', full },
            cwd = opts.dir,
          }
        end,
      })
    end

    return templates
  end,
}
