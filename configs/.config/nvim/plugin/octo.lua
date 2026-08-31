-- Dependencies that octo needs (load these eagerly or also lazily)
vim.pack.add({
  'https://github.com/nvim-lua/plenary.nvim',
  'https://github.com/nvim-telescope/telescope.nvim',
  'https://github.com/nvim-tree/nvim-web-devicons',
})

-- Lazy load octo.nvim: register a stub :Octo command that loads the real plugin on first use
vim.api.nvim_create_user_command('Octo', function(opts)
  -- Remove this stub command
  vim.api.nvim_del_user_command('Octo')

  -- Load the real plugin
  vim.pack.add({ 'https://github.com/pwntester/octo.nvim' })
  require('octo').setup({
    picker = "fzf-lua",
    enable_builtin = true,
  })

  -- Re-execute the original command with all arguments
  vim.cmd('Octo ' .. opts.args)
end, { nargs = '*', complete = function() return {} end })

-- Keymaps (these all go through :Octo, so they'll trigger the lazy load)
vim.keymap.set("n", "<leader>oi", "<cmd>Octo issue list<cr>", { desc = "List GitHub Issues" })
vim.keymap.set("n", "<leader>op", "<cmd>Octo pr list<cr>", { desc = "List GitHub PullRequests" })
vim.keymap.set("n", "<leader>od", "<cmd>Octo discussion list<cr>", { desc = "List GitHub Discussions" })
vim.keymap.set("n", "<leader>on", "<cmd>Octo notification list<cr>", { desc = "List GitHub Notifications" })
vim.keymap.set("n", "<leader>oo", function()
  -- Ensure octo is loaded first
  if not package.loaded['octo'] then
    vim.cmd('Octo')
  end
  require("octo.utils").create_base_search_command({ include_current_repo = true })
end, { desc = "Search GitHub" })
