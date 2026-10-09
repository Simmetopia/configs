-- fzf-lua glue for the zoxide picker. Feeds fzf_exec a plain path list from
-- M.list() (not the "score path" lines, to avoid placeholder-quoting bugs),
-- previews via a Lua functor returning a shell one-liner, and routes the
-- default action to project.switch (or zoxide.remove in prune mode).
local M = {}

function M.pick(opts)
  opts = opts or {}
  local project = require('project')
  local zoxide = require('project.zoxide')
  local git = require('project.git')
  local cfg = project.options

  local entries = zoxide.list(opts.terms)
  local paths = {}
  for _, e in ipairs(entries) do paths[#paths + 1] = e.path end

  if #paths == 0 then
    vim.notify('project: no zoxide matches', vim.log.levels.WARN)
    return
  end

  local act
  if opts.prune then
    -- :ZPrune — multi-select (--multi) entries to drop from the DB.
    act = function(sel)
      for _, path in ipairs(sel or {}) do
        zoxide.remove(path)
        vim.notify('project: zoxide remove ' .. path, vim.log.levels.INFO)
      end
    end
  else
    act = function(sel)
      local target = vim.F.if_nil(sel, {})[1] or ''
      if target ~= '' then
        project.switch(target, opts.cd_only and { cd_only = true } or nil)
      end
    end
  end

  local fzf_opts = {
    prompt = 'Project> ',
    actions = { default = act },
  }
  if opts.prune then fzf_opts.fzf_opts = { ['--multi'] = '' } end
  if opts.terms and #opts.terms > 0 then
    fzf_opts.query = table.concat(opts.terms, ' ')
  end

  if cfg.picker.preview then
    -- fzf-lua wraps a plain preview fn with stringify_data, so it receives the
    -- current line(s) as a TABLE, not a string. Grab the single-path case
    -- ([1]) to avoid shellescaping a List (Vim:E730).
    fzf_opts.preview = function(items)
      local entry = vim.F.if_nil(items, {})[1] or ''
      if entry == '' then return '' end
      local p = vim.fn.shellescape(entry)
      local pre = ''
      local meta = git.meta(entry)
      if meta and meta.root and (vim.uv.fs_realpath(entry) or entry) ~= meta.root then
        pre = ("printf '↑ inside %%s\\n\\n' "):format(vim.fn.shellescape(meta.root))
      end
      return pre
        .. 'if git -C ' .. p .. ' rev-parse --git-dir >/dev/null 2>&1; then '
        .. 'git -C ' .. p .. ' status --short --branch; else ls -1 ' .. p .. '; fi'
    end
  end

  local fzf = require('fzf-lua')
  if not fzf.fzf_exec then
    vim.notify('project: fzf-lua not available (plugin/fzf_lua.lua missing?)', vim.log.levels.ERROR)
    return
  end
  fzf.fzf_exec(paths, fzf_opts)
end

return M
