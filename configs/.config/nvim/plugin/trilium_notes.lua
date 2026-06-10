local trilium_notes = require("trilium_notes")

trilium_notes.setup()

vim.api.nvim_create_user_command("TriliumNoteNew", function(args)
  trilium_notes.new_note(args.args)
end, {
  nargs = "*",
  desc = "Create a local Markdown note for Trilium",
})

vim.api.nvim_create_user_command("TriliumNoteExport", function()
  trilium_notes.export_current_note()
end, {
  desc = "Export the current Markdown note to TriliumNext",
})

vim.keymap.set("n", "<leader>tn", ":TriliumNoteNew ", { desc = "Trilium new note" })
vim.keymap.set("x", "<leader>tn", "<Esc><cmd>lua require('trilium_notes').new_note_from_selection()<CR>", {
  desc = "Trilium new note from selection",
})
vim.keymap.set("n", "<leader>te", ":TriliumNoteExport<CR>", { desc = "Trilium export note" })
