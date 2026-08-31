-- Add the plugin (downloaded/cloned into pack path)
vim.pack.add({ "https://github.com/mistweaverco/kulala.nvim" })

-- Lazy-load setup on relevant filetypes
vim.api.nvim_create_autocmd("FileType", {
  pattern = { "http", "rest" },
  callback = function()
    require("kulala").setup({
      global_keymaps = true,
      global_keymaps_prefix = "<leader>R",
      kulala_keymaps_prefix = "",
    })
  end,
  once = true,
})

-- Keymaps (these will work once kulala is loaded)
vim.keymap.set("n", "<leader>Rs", function() require("kulala").run() end, { desc = "Send request" })
vim.keymap.set("n", "<leader>Ra", function() require("kulala").run_all() end, { desc = "Send all requests" })
vim.keymap.set("n", "<leader>Rb", function() require("kulala").scratchpad() end, { desc = "Open scratchpad" })
