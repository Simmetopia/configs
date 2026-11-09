-- Dependencies that octo needs (load these eagerly or also lazily)
vim.pack.add({
  'https://github.com/nvim-lua/plenary.nvim',
  'https://github.com/nvim-telescope/telescope.nvim',
  'https://github.com/nvim-tree/nvim-web-devicons',
})

-- Lazy load octo.nvim: a stub :Octo command loads the real plugin on first use
local function load_octo()
  if package.loaded['octo'] then
    return
  end
  pcall(vim.api.nvim_del_user_command, 'Octo')
  vim.pack.add({ 'https://github.com/pwntester/octo.nvim' })
  require('octo').setup({
    picker = "fzf-lua",
    enable_builtin = true,
  })
end

vim.api.nvim_create_user_command('Octo', function(opts)
  load_octo()
  -- Re-execute the original command with all arguments
  vim.cmd('Octo ' .. opts.args)
end, { nargs = '*', complete = function() return {} end })

-- Keymaps: everything lives under <leader>gh (GitHub).
-- They all go through :Octo, so the first use triggers the lazy load.
-- Commands marked (buf) only work inside an Octo issue/PR/review buffer.
local function map(lhs, cmd, desc)
  local rhs = type(cmd) == 'string' and ('<cmd>Octo ' .. cmd .. '<cr>') or cmd
  vim.keymap.set('n', '<leader>gh' .. lhs, rhs, { desc = desc })
end

-- General
map('o', 'actions', 'Octo actions')
map('n', 'notification list', 'Notifications')
map('s', function()
  load_octo()
  require('octo.utils').create_base_search_command({ include_current_repo = true })
end, 'Search (current repo)')
map('S', function()
  load_octo()
  require('octo.utils').create_base_search_command({ include_current_repo = false })
end, 'Search (all of GitHub)')
map('a', 'run list', 'Workflow runs (Actions)')
map('G', 'gist list', 'Gists')

-- Pull requests: <leader>ghp
map('pl', 'pr list', 'List PRs')
map('ps', 'pr search', 'Search PRs')
map('pn', 'pr create', 'New PR')
map('pb', 'pr', 'PR for current branch')
map('po', 'pr checkout', 'Checkout PR (buf)')
map('pd', 'pr diff', 'Diff (buf)')
map('pf', 'pr changes', 'Changed files (buf)')
map('pC', 'pr commits', 'Commits (buf)')
map('pk', 'pr checks', 'Checks (buf)')
map('pa', 'pr runs', 'Workflow runs (buf)')
map('pm', 'pr merge', 'Merge (buf)')
map('pr', 'pr ready', 'Mark ready for review (buf)')
map('pD', 'pr draft', 'Convert to draft (buf)')
map('pu', 'pr update', 'Update branch (buf)')
map('pv', 'reviewer add', 'Add reviewer (buf)')
map('px', 'pr close', 'Close (buf)')
map('pX', 'pr reopen', 'Reopen (buf)')
map('pw', 'pr browser', 'Open in browser')
map('py', 'pr url', 'Copy URL (buf)')
map('pR', 'pr reload', 'Reload (buf)')

-- Issues: <leader>ghi
map('il', 'issue list', 'List issues')
map('is', 'issue search', 'Search issues')
map('in', 'issue create', 'New issue')
map('id', 'issue develop', 'Create branch for issue (buf)')
map('ix', 'issue close', 'Close (buf)')
map('iX', 'issue reopen', 'Reopen (buf)')
map('iw', 'issue browser', 'Open in browser (buf)')
map('iy', 'issue url', 'Copy URL (buf)')
map('iR', 'issue reload', 'Reload (buf)')

-- Reviews: <leader>ghr
map('rs', 'review start', 'Start review (buf)')
map('rr', 'review resume', 'Resume review (buf)')
map('rS', 'review submit', 'Submit review')
map('rc', 'review comments', 'Pending comments')
map('rC', 'review commit', 'Review a commit')
map('rb', 'review browse', 'Browse changes (buf)')
map('rd', 'review discard', 'Discard review')
map('rx', 'review close', 'Close review tab')

-- Comments & threads: <leader>ghc
map('ca', 'comment add', 'Add comment (buf)')
map('cd', 'comment delete', 'Delete comment (buf)')
map('cr', 'thread resolve', 'Resolve thread (buf)')
map('cu', 'thread unresolve', 'Unresolve thread (buf)')

-- Labels & assignees: <leader>ghL / <leader>ghA
map('La', 'label add', 'Add label (buf)')
map('Lr', 'label remove', 'Remove label (buf)')
map('Ln', 'label create', 'Create label')
map('Aa', 'assignee add', 'Add assignee (buf)')
map('Ar', 'assignee remove', 'Remove assignee (buf)')

-- Reactions: <leader>ghe
map('e+', 'reaction thumbs_up', '👍')
map('e-', 'reaction thumbs_down', '👎')
map('eh', 'reaction heart', '❤️')
map('er', 'reaction rocket', '🚀')
map('ee', 'reaction eyes', '👀')
map('el', 'reaction laugh', '😄')
map('et', 'reaction hooray', '🎉')
map('ec', 'reaction confused', '😕')

-- Discussions: <leader>ghd
map('dl', 'discussion list', 'List discussions')
map('ds', 'discussion search', 'Search discussions')
map('dn', 'discussion create', 'New discussion')
map('dw', 'discussion browser', 'Open in browser (buf)')

-- Repo: <leader>ghR
map('Rv', 'repo view', 'View current repo')
map('Rl', 'repo list', 'List my repos')
map('Rs', 'repo search', 'Search repos')
map('Rf', 'repo fork', 'Fork repo')
map('Rw', 'repo browser', 'Open in browser')
map('Ry', 'repo url', 'Copy URL')

-- Group names for the key hint popup (mini.clue)
if _G.MiniClue then
  vim.list_extend(MiniClue.config.clues, {
    { mode = 'n', keys = '<Leader>g', desc = '+Git' },
    { mode = 'n', keys = '<Leader>gh', desc = '+GitHub' },
    { mode = 'n', keys = '<Leader>ghp', desc = '+Pull requests' },
    { mode = 'n', keys = '<Leader>ghi', desc = '+Issues' },
    { mode = 'n', keys = '<Leader>ghr', desc = '+Review' },
    { mode = 'n', keys = '<Leader>ghc', desc = '+Comments/threads' },
    { mode = 'n', keys = '<Leader>ghL', desc = '+Labels' },
    { mode = 'n', keys = '<Leader>ghA', desc = '+Assignees' },
    { mode = 'n', keys = '<Leader>ghe', desc = '+Reactions' },
    { mode = 'n', keys = '<Leader>ghd', desc = '+Discussions' },
    { mode = 'n', keys = '<Leader>ghR', desc = '+Repo' },
  })
end
