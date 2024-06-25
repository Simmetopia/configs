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

local function updateIndexAndRunNeorg()
  local bufnr = vim.api.nvim_get_current_buf()

  -- Use Tree-sitter to locate and remove the node
  local parser = vim.treesitter.get_parser(bufnr, 'norg')
  local tree = parser:parse()[1]
  local root = tree:root()

  -- Define the Tree-sitter query
  local query = vim.treesitter.query.parse('norg', [[
        (heading1 title: (_) @title
          (#eq? @title "Index"))
        @whole
    ]])

  -- Find and delete the matched node
  for id, node, _, _ in query:iter_captures(root, bufnr) do
    local name = query.captures[id]

    if (name == "whole") then
      local start_row, _, end_row, _ = node:range()

      vim.api.nvim_buf_set_lines(bufnr, start_row, end_row, true, {})
    end
  end

  -- Locate the position after '@end' following '@document.meta'
  local line_count = vim.api.nvim_buf_line_count(bufnr)
  local found_end = false
  for line = 1, line_count do
    local line_text = vim.api.nvim_buf_get_lines(bufnr, line - 1, line, false)[1]
    if found_end then
      vim.api.nvim_buf_set_lines(bufnr, line - 1, line - 1, false, { "* Index" })
      -- Set cursor to the newly inserted line
      vim.api.nvim_win_set_cursor(0, { line, 0 }) -- Adjust cursor to the "* Index" line
      -- Assuming you want to run a Neorg command on this line
      vim.api.nvim_command('Neorg generate-workspace-summary')
      break
    end
    if line_text:match("@end") then
      found_end = true
    end
  end
end

M.config = function()
  require("neorg").setup {
    -- Tell Neorg what modules to load
    load = {
      ["core.defaults"] = {},    -- Load all the default modules
      ["core.concealer"] = {},   -- Allows for use of icons
      ["core.ui.calendar"] = {}, -- Allows for creations on summieres
      ["core.ui"] = {},          -- Allows for creations on summieres
      ["core.summary"] = {},     -- Allows for creations on summieres
      ["core.presenter"] = {
        config = {
          zen_mode = "zen-mode"
        },
      },                    -- Allows for creations on summieres
      ["core.export"] = {}, -- Allows for creations on summieres

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
    "<leader>ns",
    updateIndexAndRunNeorg,
    { noremap = true, silent = true }
  )


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
