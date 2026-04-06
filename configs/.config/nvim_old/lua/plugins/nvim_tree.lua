local M = {
  "nvim-neo-tree/neo-tree.nvim",
  branch = "v3.x",
  keys = {
    { '<leader>`', ':Neotree<CR>', desc = "NVIMtree" }
  },
  dependencies = {
    "nvim-lua/plenary.nvim",
    "nvim-tree/nvim-web-devicons", -- not strictly required, but recommended
    "MunifTanjim/nui.nvim",
    -- "3rd/image.nvim", -- Optional image support in preview window: See `# Preview Mode` for more information
  }
}

M.config = function()
  require("neo-tree").setup({
    filesystem = {
      bind_to_cwd = true,  -- true creates a 2-way binding between vim's cwd and neo-tree's root
      cwd_target = {
        sidebar = "tab",   -- sidebar is when position = left or right
        current = "window" -- current is when position = current
      },
      follow_current_file = {
        enabled = true,        -- This will find and focus the file in the active buffer every time
        --              -- the current file is changed while the tree is open.
        leave_dirs_open = false, -- `false` closes auto expanded dirs, such as with `:Neotree reveal`
      },
    },
  })
end

return M
