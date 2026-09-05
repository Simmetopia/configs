-- External formatters keyed by filetype
local external = {
  cs = { "csharpier", "format", "--write-stdout" },
  sh = { "shfmt", "-i", "2" },
  bash = { "shfmt", "-i", "2" },
}

-- Filetypes where we prefer an LSP client other than the default pick
local lsp_filter = function(client)
  -- Don't let tsserver format if prettier-via-LSP is attached
  if client.name == "ts_ls" or client.name == "vtsls" then
    return false
  end
  return true
end

local function format()
  local ft = vim.bo.filetype
  local bufnr = vim.api.nvim_get_current_buf()

  if external[ft] then
    local cmd = external[ft]
    local input = table.concat(vim.api.nvim_buf_get_lines(bufnr, 0, -1, false), "\n")
    local result = vim.system(cmd, { stdin = input }):wait()
    if result.code ~= 0 then
      vim.notify("Format failed: " .. (result.stderr or ""), vim.log.levels.ERROR)
      return
    end

    local lines = vim.split(result.stdout, "\n", { plain = true })
    -- vim.system adds a trailing empty string if stdout ends in \n; trim it
    if lines[#lines] == "" then table.remove(lines) end
    vim.api.nvim_buf_set_lines(bufnr, 0, -1, false, lines)
  else
    vim.lsp.buf.format({ async = false, filter = lsp_filter })
  end

  -- Trailing whitespace cleanup, matches your current behavior
  local save = vim.fn.winsaveview()
  vim.cmd([[silent! keeppatterns %s/\s\+$//e]])
  vim.fn.winrestview(save)
end

-- Format on save
vim.api.nvim_create_autocmd("BufWritePre", {
  callback = format,
})

-- Format on <leader>f
vim.keymap.set("n", "<leader>f", format)
