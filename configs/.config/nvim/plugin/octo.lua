-- Octo (GitHub client). Dependencies load eagerly; octo.nvim itself is loaded
-- lazily via a stub :Octo command so first startup is fast.
vim.pack.add({
  'https://github.com/nvim-lua/plenary.nvim',
  'https://github.com/nvim-telescope/telescope.nvim',
  'https://github.com/nvim-tree/nvim-web-devicons',
})

-- Lazy-load octo.nvim on first :Octo use. On success the stub is removed and
-- the real plugin owns the command; on failure we keep the stub and retry.
local function octo_cmd(opts)
  vim.pack.add({ 'https://github.com/pwntester/octo.nvim' })

  local ok, err = pcall(vim.cmd, 'packadd octo.nvim')
  if ok then ok, err = pcall(require, 'octo') end
  if not ok then
    vim.notify('octo.nvim failed to load: ' .. tostring(err), vim.log.levels.ERROR)
    return
  end

  vim.api.nvim_del_user_command('Octo')
  require('octo').setup({
    picker = 'fzf-lua',
    enable_builtin = true, -- :Octo with no args shows the actions menu
  })
  vim.cmd('Octo ' .. opts.args) -- re-run against the real command
end
vim.api.nvim_create_user_command('Octo', octo_cmd, {
  nargs = '*',
  complete = function() return {} end,
})

-- GitHub keymaps, all under <leader>gh. mini.clue (plugin/mini.lua) shows
-- these automatically via their `desc` when you press <leader>.
-- Every RHS below is a real builtin :Octo <object> <action> pair; the stub
-- command lazy-loads octo.nvim on first hit and re-executes.
--
-- { suffix,  :Octo arguments,            description }
local gh = {
  x = { '',                         'All octo actions (menu)' },
  i = { 'issue list',               'List issues' },
  I = { 'issue list createdBy=@me', 'List issues authored by me' },
  a = { 'issue create',             'Create issue' },
  p = { 'pr list',                  'List pull requests' },
  P = { 'pr list createdBy=@me',    'List pull requests authored by me' },
  c = { 'pr create',                'Create pull request' },
  b = { 'pr checkout',              'Checkout pull request (pick)' },
  d = { 'pr diff',                  'Diff current PR buffer' },
  m = { 'pr merge',                 'Merge current pull request' },
  n = { 'notification list',        'List notifications' },
  s = { 'search',                   'Search GitHub' },
  r = { 'review start',             'Start review (PR buffer)' },
  w = { 'workflow list',            'List workflows' },
  R = { 'run list',                 'List workflow runs' },
  g = { 'gist list',                'List gists' },
  e = { 'release list',             'List releases' },
  o = { 'repo list',                'List repositories' },
  D = { 'discussion list',          'List discussions' },
  l = { 'limits',                   'GitHub API rate limits' },
}

-- NOTE: Lua has no destructuring in for-loops; that syntax was the E5112
-- error that previously bricked this whole file.
for key, spec in pairs(gh) do
  local cmd, desc = spec[1], spec[2]
  vim.keymap.set('n', '<leader>gh' .. key, '<cmd>Octo ' .. cmd .. '<cr>', { desc = desc })
end
