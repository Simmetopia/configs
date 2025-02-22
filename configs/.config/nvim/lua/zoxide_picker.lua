local action_state = require('telescope.actions.state')
local actions = require('telescope.actions') -- Added missing actions import

local M = {}

-- Configurable options
local config = {
  min_score = 2,
  cache_timeout = 300, -- 5 minutes cache
  use_fzf = true,      -- Use fzf sorter if available
  previewer = false,   -- Enable/disable directory preview
  prompt_title = 'Zoxide Directories',
  keymap = {
    open = { action = 'select_default', key = '<CR>' },
    find_files = { action = 'find_files', key = '<C-f>' },
    browse_files = { action = 'file_browser', key = '<C-b>' },
  }
}

-- Cache variables
local last_update = 0
local cached_results = {}

-- Improved zoxide query with error handling and caching
local function get_zoxide_list()
  local now = os.time()

  if now - last_update < config.cache_timeout and #cached_results > 0 then
    return cached_results
  end

  local handle, err = io.popen('zoxide query -ls')
  if not handle then
    vim.notify('Zoxide error: ' .. (err or 'unknown'), vim.log.levels.ERROR)
    return {}
  end

  local result = handle:read('*a')
  handle:close()

  if not result or result == '' then
    vim.notify('No results from zoxide', vim.log.levels.WARN)
    return {}
  end

  local paths = {}
  for line in vim.gsplit(result, '\n', { plain = true }) do
    local score, path = line:match('^(%S+)%s+(.*)$')
    score = tonumber(score)
    if score and path and score >= config.min_score then
      table.insert(paths, {
        score = score,
        path = vim.fn.expand(path:gsub('\\ ', ' '))
      })
    end
  end

  cached_results = paths
  last_update = now
  return paths
end

-- Enhanced picker with better type handling and preview
function M.zoxide_picker()
  local pickers = require('telescope.pickers')
  local finders = require('telescope.finders')
  local conf = require('telescope.config').values
  local sorters = require('telescope.sorters')

  local entries = get_zoxide_list()
  if vim.tbl_isempty(entries) then return end

  pickers.new({}, {
    prompt_title = config.prompt_title,
    finder = finders.new_table({
      results = entries,
      entry_maker = function(entry)
        return {
          value = entry.path,
          display = string.format('%6.2f %s', entry.score, entry.path),
          ordinal = entry.path,
          score = entry.score,
        }
      end
    }),
    sorter = config.use_fzf and sorters.get_fzy_sorter() or sorters.get_generic_fuzzy_sorter(),
    previewer = config.previewer and conf.file_previewer({}),
    attach_mappings = function(prompt_bufnr, map)
      -- Default action: cd and open find_files
      actions.select_default:replace(function()
        actions.close(prompt_bufnr)
        local selection = action_state.get_selected_entry()
        vim.fn.chdir(selection.value)
        require('telescope.builtin').find_files()
      end)

      -- Additional key mappings
      for mapping, def in pairs(config.keymap) do
        map('i', def.key, function()
          actions.close(prompt_bufnr)
          local selection = action_state.get_selected_entry()
          require('telescope.builtin')[def.action]({ cwd = selection.value })
        end)
      end

      -- Refresh cache mapping
      map('i', '<C-r>', function()
        cached_results = {}
        actions.refresh(prompt_bufnr)()
      end)

      return true
    end
  }):find()
end

-- Setup function for configuration
function M.setup(opts)
  config = vim.tbl_deep_extend('force', config, opts or {})
end

-- Register command and keymap
vim.api.nvim_create_user_command('TelescopeZoxide', M.zoxide_picker, {})
vim.keymap.set('n', '<leader>pp', M.zoxide_picker, { desc = '[S]earch Zoxide Directories' })

return M
