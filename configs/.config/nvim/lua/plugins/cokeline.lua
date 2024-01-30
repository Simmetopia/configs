local M = {
  "willothy/nvim-cokeline",
  dependencies = {
    "nvim-lua/plenary.nvim",        -- Required for v0.4.0+
    "kyazdani42/nvim-web-devicons", -- If you want devicons
    "stevearc/resession.nvim"       -- Optional, for persistent history
  }
}

M.config = function()
  local get_hex = require('cokeline.hlgroups').get_hl_attr

  local yellow = vim.g.terminal_color_3

  require('cokeline').setup({
    default_hl = {
      fg = function(buffer)
        return
            buffer.is_focused
            and get_hex('Normal', 'fg')
            or get_hex('Comment', 'fg')
      end,
      bg = function() return get_hex('ColorColumn', 'bg') end,
    },

    sidebar = {
      filetype = { 'NvimTree', 'neo-tree', 'CHADTree' },
      components = {
        {
          text = function(buf)
            return buf.filetype
          end,
          fg = yellow,
          bg = function() return get_hex('CHADTreeNormal', 'bg') end,
          bold = true,
        },
      }
    },

    components = {
      {
        text = function(buffer) return (buffer.index ~= 1) and '▏' or '' end,
      },
      {
        text = '  ',
      },
      {
        text = function(buffer)
          return buffer.devicon.icon
        end,
        fg = function(buffer)
          return buffer.devicon.color
        end,
      },
      {
        text = ' ',
      },
      {
        text = function(buffer) return buffer.filename .. '  ' end,
        bold = function(buffer)
          return buffer.is_focused
        end,
      },
      {
        text = '',
        on_click = function(_, _, _, _, buffer)
          buffer:delete()
        end,
      },
      {
        text = '  ',
      },
    },
  })
end



return M
