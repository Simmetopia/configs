local M = {}

local config = {
  min_score = 2,
  cache_timeout = 300,
}

local last_update = 0
local cached_results = {}

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
      table.insert(paths, vim.fn.expand(path:gsub('\\ ', ' ')))
    end
  end

  cached_results = paths
  last_update = now
  return paths
end

function M.zoxide_picker()
  local items = get_zoxide_list()
  if vim.tbl_isempty(items) then return end

  local chosen = MiniPick.start({
    source = {
      name = 'Zoxide',
      items = items,
    },
  })

  if chosen then
    vim.fn.chdir(chosen)
    MiniPick.builtin.files()
  end
end

function M.setup(opts)
  config = vim.tbl_deep_extend('force', config, opts or {})
end

vim.api.nvim_create_user_command('ZoxidePick', M.zoxide_picker, {})
vim.keymap.set('n', '<leader>pp', M.zoxide_picker, { desc = 'Zoxide Directories' })

return M
