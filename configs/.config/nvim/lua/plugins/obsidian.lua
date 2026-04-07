local M = {
  "obsidian-nvim/obsidian.nvim",
  version = "*", -- use latest release, remove to use latest commit
}

M.config = function()
  local bi = require("obsidian.builtin")

  require("obsidian").setup {
    ---@module 'obsidian'
    ---@type obsidian.config
    legacy_commands = false,
    note = {
      id_func = bi.title_id
    },
    workspaces = {
      {
        name = "vault",
        path = "~/Documents/vaultish/",
      },
    },
  }
end
local function map(mode, lhs, rhs)
  vim.keymap.set(mode, lhs, rhs, { noremap = true, silent = true })
end

-- Navigation / search
map("n", "<leader>os", ":Obsidian search<CR>")       -- search vault (ripgrep)
map("n", "<leader>oq", ":Obsidian quick_switch<CR>")  -- quick switch by name
map("n", "<leader>of", ":Obsidian follow_link<CR>")   -- follow link under cursor

-- Daily notes
map("n", "<leader>ot", ":Obsidian today<CR>")         -- today's note
map("n", "<leader>oy", ":Obsidian yesterday<CR>")     -- yesterday's note
map("n", "<leader>om", ":Obsidian tomorrow<CR>")      -- tomorrow's note
map("n", "<leader>od", ":Obsidian dailies<CR>")       -- picker list of dailies

-- Note management
map("n", "<leader>on", ":Obsidian new<CR>")           -- new note
map("n", "<leader>oN", ":Obsidian new_from_template<CR>") -- new note from template
map("n", "<leader>oR", ":Obsidian rename<CR>")        -- rename note + update backlinks
map("n", "<leader>oe", ":Obsidian template<CR>")      -- insert template

-- In-note navigation
map("n", "<leader>ob", ":Obsidian backlinks<CR>")     -- backlinks picker
map("n", "<leader>ol", ":Obsidian links<CR>")         -- links in current note picker
map("n", "<leader>oi", ":Obsidian toc<CR>")           -- table of contents picker
map("n", "<leader>ok", ":Obsidian toggle_checkbox<CR>") -- cycle checkbox state
map("n", "<leader>op", ":Obsidian paste_img<CR>")     -- paste image from clipboard

-- Tags / workspace
map("n", "<leader>oa", ":Obsidian tags<CR>")          -- tags picker
map("n", "<leader>ow", ":Obsidian workspace<CR>")     -- switch workspace
map("n", "<leader>oO", ":Obsidian open<CR>")          -- open in Obsidian app

-- Visual mode
map("v", "<leader>oc", ":Obsidian extract_note<CR>")  -- extract selection to new note
map("v", "<leader>oL", ":Obsidian link<CR>")          -- link selection to existing note
map("v", "<leader>oln", ":Obsidian link_new<CR>")     -- link selection to new note

return M
