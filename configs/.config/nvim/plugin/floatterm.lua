vim.pack.add({ 'https://github.com/numToStr/FTerm.nvim' })

local FTerm = require("FTerm")

FTerm.setup({
  border = "single",
  dimensions = {
    height = 0.8,
    width = 0.8,
  },
})

vim.keymap.set('n', '<F12>', FTerm.toggle, { noremap = true, silent = true })
vim.keymap.set('t', '<F12>', FTerm.toggle, { noremap = true, silent = true })

-- single <Esc> belongs to the program running in the terminal (lazygit, etc.),
-- so double-tap it to get back to normal mode instead
vim.keymap.set('t', '<Esc><Esc>', [[<C-\><C-n>]], { noremap = true, silent = true, desc = 'Terminal: escape to normal mode' })

local gitui = FTerm:new({
  ft = "fterm_gitui",
  cmd = "lazygit",
  dimensions = {
    height = 0.9,
    width = 0.9,
  },
})

vim.api.nvim_create_user_command("LazyGit", function()
  gitui:toggle()
end, { bang = true })

vim.keymap.set('n', '<leader>lg', '<CMD>LazyGit<CR>')
