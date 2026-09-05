vim.pack.add({ 'https://github.com/obsidian-nvim/obsidian.nvim' })

require('obsidian').setup(
  {
    dir = "~/Documents/vaultish/",
    legacy_commands = false
  })

vim.api.nvim_create_autocmd("FileType", {
  pattern = "markdown",
  callback = function()
    vim.opt_local.conceallevel = 2
  end,
})

local function export_to_pdf()
  local bufnr = vim.api.nvim_get_current_buf()
  local file = vim.api.nvim_buf_get_name(bufnr)
  if file == "" then
    vim.notify("Buffer has no file", vim.log.levels.ERROR)
    return
  end

  local lines = vim.api.nvim_buf_get_lines(bufnr, 0, -1, false)
  if lines[1] ~= "---" then
    vim.notify("No frontmatter found", vim.log.levels.ERROR)
    return
  end

  local function strip_quotes(s)
    s = s:gsub("^%s+", ""):gsub("%s+$", "")
    return (s:gsub('^"(.*)"$', "%1"):gsub("^'(.*)'$", "%1"))
  end

  local alias
  for i = 2, #lines do
    local l = lines[i]
    if l == "---" then break end
    local key, rest = l:match("^(aliases?):%s*(.*)$")
    if key then
      if rest == "" then
        local item = (lines[i + 1] or ""):match("^%s*%-%s*(.+)$")
        if item then alias = strip_quotes(item) end
      else
        local inline = rest:match("^%[(.*)%]$")
        if inline then
          local first = inline:match("([^,]+)")
          if first and strip_quotes(first) ~= "" then
            alias = strip_quotes(first)
          end
        else
          alias = strip_quotes(rest)
        end
      end
      break
    end
  end

  if not alias or alias == "" then
    vim.notify("No alias found in frontmatter", vim.log.levels.ERROR)
    return
  end

  local out = vim.fn.expand("~/Documents/") .. alias .. ".pdf"
  vim.system(
    { "pandoc", file, "-o", out, "--pdf-engine=typst",
      "-V", "papersize=a4", "-V", "margin-x=25mm", "-V", "margin-y=20mm",
      "-V", "mainfont=Inter", "-V", "sansfont=Inter" },
    { text = true },
    function(obj)
      vim.schedule(function()
        if obj.code == 0 then
          vim.notify("Exported to " .. out)
        else
          vim.notify("pandoc/typst failed: " .. (obj.stderr or ""), vim.log.levels.ERROR)
        end
      end)
    end
  )
end

vim.api.nvim_create_user_command("ObsidianExportPdf", export_to_pdf, {})
vim.keymap.set("n", "<leader>oe", export_to_pdf, { noremap = true, silent = true, desc = "Obsidian export to PDF" })

vim.keymap.set("n", "<leader>os", ":Obsidian search<CR>", { noremap = true, silent = true })
vim.keymap.set("n", "<leader>ot", ":Obsidian today<CR>", { noremap = true, silent = true })
vim.keymap.set("n", "<leader>on", ":Obsidian new<CR>", { noremap = true, silent = true })
vim.keymap.set("n", "<leader>ob", ":Obsidian backlinks<CR>", { noremap = true, silent = true })
