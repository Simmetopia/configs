vim.pack.add({ 'https://github.com/echasnovski/mini.nvim' })

-- Core modules
require('mini.comment').setup()
require('mini.surround').setup()
require('mini.statusline').setup()
require('mini.tabline').setup()
require('mini.notify').setup()
require('mini.extra').setup()

-- Clue (replaces which-key)
local miniclue = require('mini.clue')
miniclue.setup({
  triggers = {
    { mode = 'n', keys = '<Leader>' },
    { mode = 'x', keys = '<Leader>' },
    { mode = 'n', keys = 'g' },
    { mode = 'x', keys = 'g' },
    { mode = 'n', keys = "'" },
    { mode = 'n', keys = '`' },
    { mode = 'x', keys = "'" },
    { mode = 'x', keys = '`' },
    { mode = 'n', keys = '"' },
    { mode = 'x', keys = '"' },
    { mode = 'i', keys = '<C-r>' },
    { mode = 'c', keys = '<C-r>' },
    { mode = 'n', keys = '<C-w>' },
    { mode = 'n', keys = 'z' },
    { mode = 'x', keys = 'z' },
  },
  clues = {
    miniclue.gen_clues.builtin_completion(),
    miniclue.gen_clues.g(),
    miniclue.gen_clues.marks(),
    miniclue.gen_clues.registers(),
    miniclue.gen_clues.windows(),
    miniclue.gen_clues.z(),
  },
})

-- Pick (replaces telescope)
local pick = require('mini.pick')
pick.setup()
vim.ui.select = pick.ui_select

vim.keymap.set('n', '<leader>sf', pick.builtin.files, { desc = '[S]earch [F]iles' })
vim.keymap.set('n', '<leader>sg', pick.builtin.grep_live, { desc = '[S]earch by [G]rep' })
vim.keymap.set('n', '<leader>sh', pick.builtin.help, { desc = '[S]earch [H]elp' })
vim.keymap.set('n', '<leader>sr', pick.builtin.resume, { desc = '[S]earch [R]esume' })
vim.keymap.set('n', '<leader><leader>', pick.builtin.buffers, { desc = '[ ] Find existing buffers' })
vim.keymap.set('n', '<leader>sw', function()
  pick.builtin.grep({ pattern = vim.fn.expand('<cword>') })
end, { desc = '[S]earch current [W]ord' })
vim.keymap.set('n', '<leader>sd', function()
  MiniExtra.pickers.diagnostic()
end, { desc = '[S]earch [D]iagnostics' })
vim.keymap.set('n', '<leader>sk', function()
  MiniExtra.pickers.keymaps()
end, { desc = '[S]earch [K]eymaps' })
vim.keymap.set('n', '<leader>s.', function()
  MiniExtra.pickers.oldfiles()
end, { desc = '[S]earch Recent Files' })
vim.keymap.set('n', '<leader>sn', function()
  pick.builtin.files({}, { source = { cwd = vim.fn.stdpath('config') } })
end, { desc = '[S]earch [N]eovim files' })

vim.api.nvim_create_user_command("PickConfig", function()
  pick.builtin.files({}, { source = { cwd = vim.fn.stdpath('config') } })
end, {})

-- Starter
local starter = require('mini.starter')
starter.setup({
  items = {
    { name = 'Update plugins', action = 'lua vim.pack.update()', section = 'Actions' },
    { name = 'Find file', action = function() pick.builtin.files() end, section = 'Actions' },
    { name = 'Find project', action = function() require('zoxide_picker').zoxide_picker() end, section = 'Actions' },
    { name = 'Dotfiles', action = function()
      vim.cmd('cd ' .. vim.fn.stdpath('config'))
      pick.builtin.files()
    end, section = 'Actions' },
    starter.sections.recent_files(5, false),
  },
})
