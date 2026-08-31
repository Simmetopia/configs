vim.pack.add({ 'https://github.com/obsidian-nvim/obsidian.nvim' })

require('obsidian').setup(
  {
    dir = "~/vaultish/",
    legacy_commands = false
  })
  
vim.api.nvim_create_autocmd("FileType", {
  pattern = "markdown",
  callback = function()
    vim.opt_local.conceallevel = 2
  end,
})


vim.keymap.set("n", "<leader>os", ":Obsidian search<CR>", { noremap = true, silent = true })
vim.keymap.set("n", "<leader>ot", ":Obsidian today<CR>", { noremap = true, silent = true })
vim.keymap.set("n", "<leader>on", ":Obsidian new<CR>", { noremap = true, silent = true })
vim.keymap.set("n", "<leader>ob", ":Obsidian backlinks<CR>", { noremap = true, silent = true })
