local M = {
  "nvim-neorg/neorg",
  lazy = false,  -- Disable lazy loading as some `lazy.nvim` distributions set `lazy = true` by default
  version = "*", -- Pin Neorg to the latest stable release
  config = true,
}


M.config = function()
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

  vim.keymap.set(
    "n",
    "<leader>nr",
    ":Neorg return<CR>",
    { noremap = true, silent = true }
  )

  vim.keymap.set(
    "n",
    "<leader>ni",
    ":Neorg index<CR>",
    { noremap = true, silent = true }
  )
  vim.keymap.set(
    "n",
    "<leader>nt",
    ":Neorg journal today<CR>",
    { noremap = true, silent = true }
  )
  vim.keymap.set(
    "n",
    "<leader>ny",
    ":Neorg journal today<CR>",
    { noremap = true, silent = true }
  )

  vim.keymap.set(
    "n",
    "<leader>nf",
    function()
      require 'telescope.builtin'.find_files {
        cwd = "~/notes"
      }
    end,
    { noremap = true, silent = true }
  )
end
return M
