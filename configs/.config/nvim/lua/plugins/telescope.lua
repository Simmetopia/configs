local M = {
  "nvim-telescope/telescope.nvim",
  version = "0.1.x",
  dependencies = { { "nvim-lua/plenary.nvim" }, { 'nvim-telescope/telescope-ui-select.nvim' } },
}

M.config = function()
  local actions = require("telescope.actions")
  local builtin = require("telescope.builtin")

  local telescope = require('telescope')

  telescope.setup({
    extensions = {
      ["ui-select"] = {
        require("telescope.themes").get_dropdown {}
      },
    },
  })

  pcall(require('telescope').load_extension, 'fzf')
  pcall(require('telescope').load_extension, 'ui-select')

  vim.keymap.set('n', '<leader>sh', builtin.help_tags, { desc = '[S]earch [H]elp' })
  vim.keymap.set('n', '<leader>sk', builtin.keymaps, { desc = '[S]earch [K]eymaps' })
  vim.keymap.set('n', '<leader>sf', builtin.find_files, { desc = '[S]earch [F]iles' })
  vim.keymap.set('n', '<leader>ss', builtin.builtin, { desc = '[S]earch [S]elect Telescope' })
  vim.keymap.set('n', '<leader>sw', builtin.grep_string, { desc = '[S]earch current [W]ord' })
  vim.keymap.set('n', '<leader>sg', builtin.live_grep, { desc = '[S]earch by [G]rep' })
  vim.keymap.set('n', '<leader>sd', builtin.diagnostics, { desc = '[S]earch [D]iagnostics' })
  vim.keymap.set('n', '<leader>sr', builtin.resume, { desc = '[S]earch [R]esume' })
  vim.keymap.set('n', '<leader>s.', builtin.oldfiles, { desc = '[S]earch Recent Files ("." for repeat)' })
  vim.keymap.set('n', '<leader><leader>', builtin.buffers, { desc = '[ ] Find existing buffers' })

  local function browse_config  ()
    builtin.find_files { cwd = vim.fn.stdpath 'config' }
  end

  vim.keymap.set('n', '<leader>sn', browse_config, { desc = '[S]earch [N]eovim files' })


  -- Optional: Register the command, if you want it to be callable as :Telescope zoxide
  vim.api.nvim_create_user_command("TelescopeConfig", browse_config, {})

  local action_state = require('telescope.actions.state')

  -- Function to get zoxide results as table
  local function get_zoxide_list()
    local handle = io.popen("zoxide query -ls")
    if not handle then
      print("Failed to execute zoxide")
      return {}
    end
    local result = handle:read("*a")
    handle:close()

    if not result then
      print("No results from zoxide")
      return {}
    end

    local paths = {}
    for score, path in string.gmatch(result, "(%S+) (%S+)") do
      if tonumber(score) >= 2 then
        table.insert(paths, path)
      end
    end
    return paths
  end

  -- Telescope picker for zoxide results
  local function zoxide_picker()
    local pickers = require("telescope.pickers")
    local finders = require("telescope.finders")
    local conf = require("telescope.config").values

    pickers.new({}, {
      prompt_title = "Zoxide Directories",
      finder = finders.new_table({
        results = get_zoxide_list(),
        entry_maker = function(entry)
          return {
            value = entry,
            display = entry,
            ordinal = entry,
          }
        end
      }),
      sorter = conf.generic_sorter({}),
      attach_mappings = function(prompt_bufnr, map)
        actions.select_default:replace(function()
          actions.close(prompt_bufnr)
          local selection = action_state.get_selected_entry()
          vim.cmd("cd " .. selection.value)
          vim.cmd("Telescope find_files")
        end)
        return true
      end
    }):find()
  end

  -- Optional: Register the command, if you want it to be callable as :Telescope zoxide
  vim.api.nvim_create_user_command("TelescopeZoxide", zoxide_picker, {})

  -- Optional: Map to a leader key combination
  vim.keymap.set('n', '<leader>pp', zoxide_picker, { desc = '[S]earch Zoxide Directories' })
end

return M
