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

-- single <Esc> belongs to the program running in the terminal (aider, lazygit),
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

local aider_conventions = vim.fn.expand("~/.config/aider/CONVENTIONS.md")

local function aider_cmd()
  local parts = { "aider", "--watch-files", "--no-auto-commits" }

  if vim.uv.fs_stat(aider_conventions) then
    table.insert(parts, "--read " .. vim.fn.shellescape(aider_conventions))
  end

  -- pick up per-project conventions on top of the global ones
  local local_conventions = vim.fs.joinpath(vim.fn.getcwd(), "CONVENTIONS.md")
  if vim.uv.fs_stat(local_conventions) then
    table.insert(parts, "--read " .. vim.fn.shellescape(local_conventions))
  end

  return table.concat(parts, " ")
end

local aider = FTerm:new({
  ft = "fterm_aider",
  cmd = aider_cmd,
  dimensions = {
    height = 0.9,
    width = 0.9,
  },
})

-- FTerm's `close(true)` bails out early when the float is hidden, which leaves
-- the aider job running. Tear it down ourselves regardless of window state.
local function aider_kill()
  if aider.win and vim.api.nvim_win_is_valid(aider.win) then
    vim.api.nvim_win_close(aider.win, true)
  end
  aider.win = nil

  if aider.terminal then
    pcall(vim.fn.jobstop, aider.terminal)
    aider.terminal = nil
  end

  if aider.buf and vim.api.nvim_buf_is_valid(aider.buf) then
    vim.api.nvim_buf_delete(aider.buf, { force = true })
  end
  aider.buf = nil

  aider:restore_cursor()
end

-- drop aider's chat history without restarting it (and without stealing focus)
local function aider_clear()
  if not aider.terminal then
    return vim.notify("Aider is not running", vim.log.levels.WARN)
  end

  local ok = pcall(vim.api.nvim_chan_send, aider.terminal, "/clear\r")
  if not ok then
    return vim.notify("Aider session is gone", vim.log.levels.WARN)
  end
end

vim.api.nvim_create_user_command("Aider", function()
  aider:toggle()
end, { bang = true })

vim.api.nvim_create_user_command("AiderClose", aider_kill, { bang = true })

vim.api.nvim_create_user_command("AiderClear", aider_clear, { bang = true })

vim.keymap.set('n', '<leader>ai', '<CMD>Aider<CR>', { desc = 'Toggle aider' })
vim.keymap.set('n', '<leader>nai', '<CMD>AiderClose<CR>', { desc = 'Kill aider' })
vim.keymap.set('n', '<leader>cai', '<CMD>AiderClear<CR>', { desc = 'Clear aider session' })
