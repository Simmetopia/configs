local M = {
  "nvim-neorg/neorg",
  dependencies = { "luarocks.nvim", "telescope.nvim" },
  keys = {
    { "<leader>nr", "<cmd>Neorg return<CR>" },
    { "<leader>ni", "<cmd>Neorg index<CR>" },
    { "<leader>nt", "<cmd>Neorg journal today<CR>" },
    { "<leader>nf", "<cmd>lua require 'telescope.builtin'.find_files { cwd = '~/notes' }<CR>" },
  },
  lazy = true,   -- Disable lazy loading as some `lazy.nvim` distributions set `lazy = true` by default
  version = "*", -- Pin Neorg to the latest stable release
}

M.config = function()
  require("neorg").setup {
    -- Tell Neorg what modules to load
    load = {
      ["core.defaults"] = {},    -- Load all the default modules
      ["core.concealer"] = {},   -- Allows for use of icons
      ["core.ui.calendar"] = {}, -- Allows for creations on summieres
      ["core.ui"] = {},          -- Allows for creations on summieres
      ["core.summary"] = {},     -- Allows for creations on summieres
      ["core.completion"] = {
        config = {
          engine = "nvim-cmp"
        }
      },                  -- Allows for creations on summieres
      ["core.dirman"] = { -- Manage your directories with Neorg
        config = {
          workspaces = {
            notes = "~/notes"
          },
          default_workspace = "notes",
        }
      }
    }
  }

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
