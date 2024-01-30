local function cd_to_git_root()
  -- Find the nearest git root directory
  local git_root = vim.fn.systemlist("git rev-parse --show-toplevel")[1]

  -- If git root is not found or is the home directory, don't change the current directory
  if git_root == "" or git_root == vim.loop.os_homedir() then
    return
  end

  -- Change the current working directory to the git root
  vim.fn.chdir(git_root)

  -- Print a message to the user
  vim.api.nvim_out_write(string.format("Changed directory to %s\n", git_root))
end

local M = {
  "tpope/vim-fugitive",
  dependencies = {
    "tpope/vim-rhubarb"
  },
  config = function()
    local autocmd = vim.api.nvim_create_autocmd
    vim.keymap.set("n", "<leader>gs", vim.cmd.Git)
    vim.keymap.set("n", "<leader>w", ":Gwrite<CR>")

    -- Map a key to change to the git root directory
    vim.keymap.set("n", "<Leader>cd", cd_to_git_root, { noremap = true, silent = true })

    autocmd("BufWinEnter", {
      pattern = "*",
      callback = function()
        if vim.bo.ft ~= "fugitive" then
          return
        end

        local bufnr = vim.api.nvim_get_current_buf()
        local opts = { buffer = bufnr, remap = false }
        vim.keymap.set("n", "<leader>p", function()
          vim.cmd.Git("push")
        end, opts)

        -- NOTE: It allows me to easily set the branch i am pushing and any tracking
        -- needed if i did not set the branch up correctly
        vim.keymap.set("n", "<leader>t", ":Git push -u origin ", opts)
      end,
    })
  end,
}
return M
