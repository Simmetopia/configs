vim.pack.add({
  'https://github.com/vhyrro/luarocks.nvim',
  'https://github.com/nvim-neorg/neorg',
})

require("luarocks-nvim").setup()

require("neorg").setup {
  load = {
    ["core.defaults"] = {},
    ["core.concealer"] = {},
    ["core.summary"] = {},
    ["core.dirman"] = {
      config = {
        workspaces = {
          notes = "~/notes",
        },
        default_workspace = "notes",
      },
    },
  },
}

vim.wo.foldlevel = 99
vim.wo.conceallevel = 2

vim.keymap.set("n", "<leader>nr", ":Neorg return<CR>", { noremap = true, silent = true })
vim.keymap.set("n", "<leader>ni", ":Neorg index<CR>", { noremap = true, silent = true })
vim.keymap.set("n", "<leader>nt", ":Neorg journal today<CR>", { noremap = true, silent = true })
vim.keymap.set("n", "<leader>ny", ":Neorg journal today<CR>", { noremap = true, silent = true })
vim.keymap.set("n", "<leader>nf", function()
  MiniPick.builtin.files({}, { source = { cwd = vim.fn.expand("~/notes") } })
end, { noremap = true, silent = true })
