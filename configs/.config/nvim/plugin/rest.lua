-- rest.nvim: HTTP client for .http files
-- https://github.com/rest-nvim/rest.nvim
--
-- rest.nvim is published as a luarocks package. vim.pack does not resolve rockspec
-- dependencies, so they are installed here manually:
--   * nvim-nio, fidget.nvim       -> regular Neovim plugins (vim.pack)
--   * mimetypes, xml2lua          -> pure Lua rocks (system `luarocks`, private tree)
--   * tree-sitter-http parser     -> tree-sitter-manager ("http" in ensure_installed)
--
-- Everything below must happen BEFORE rest.nvim is added, because its plugin/ file
-- checks for the dependencies as soon as it is sourced.

-- Lua rocks ------------------------------------------------------------------
local rocks_tree = vim.fs.joinpath(vim.fn.stdpath("data"), "rest-nvim-rocks")
local rocks_lua = vim.fs.joinpath(rocks_tree, "share", "lua", "5.1")
package.path = table.concat({
  vim.fs.joinpath(rocks_lua, "?.lua"),
  vim.fs.joinpath(rocks_lua, "?", "init.lua"),
  package.path,
}, ";")

local missing = vim.tbl_filter(function(rock)
  return package.searchpath(rock, package.path) == nil
end, { "mimetypes", "xml2lua" })

if #missing > 0 then
  if vim.fn.executable("luarocks") == 1 then
    for _, rock in ipairs(missing) do
      vim.notify("rest.nvim: installing Lua rock '" .. rock .. "'...", vim.log.levels.INFO)
      local res = vim.system({ "luarocks", "--lua-version", "5.1", "--tree", rocks_tree, "install", rock }):wait()
      if res.code ~= 0 then
        vim.notify(
          ("rest.nvim: failed to install rock '%s':\n%s"):format(rock, res.stderr or res.stdout or ""),
          vim.log.levels.ERROR
        )
      end
    end
  else
    vim.notify(
      "rest.nvim: `luarocks` not found, cannot install: " .. table.concat(missing, ", "),
      vim.log.levels.ERROR
    )
  end
end

-- Configuration (read by rest.nvim, no setup() call) ---------------------------
---@type rest.Opts
vim.g.rest_nvim = {
  -- defaults are fine; see `:h rest-nvim.config`
}

-- Treat *.rest files as http as well (Neovim only detects *.http)
vim.filetype.add({ extension = { rest = "http" } })

-- Plugins --------------------------------------------------------------------
vim.pack.add({
  "https://github.com/nvim-neotest/nvim-nio",
  "https://github.com/j-hui/fidget.nvim",
})
vim.pack.add({ "https://github.com/rest-nvim/rest.nvim" })

-- Response formatting ---------------------------------------------------------
-- rest.nvim formats response bodies with `gq`, which needs 'formatprg'/'formatexpr'.
if vim.fn.executable("jq") == 1 then
  vim.api.nvim_create_autocmd("FileType", {
    pattern = "json",
    group = vim.api.nvim_create_augroup("rest_nvim_json_formatprg", { clear = true }),
    callback = function(ev)
      if vim.bo[ev.buf].formatprg == "" then
        vim.bo[ev.buf].formatprg = "jq ."
      end
    end,
  })
end

-- Basic auth ------------------------------------------------------------------
-- Like IntelliJ/kulala: `Authorization: Basic user:password` (or `Basic user password`)
-- is base64-encoded automatically. Already-encoded values are left untouched.
-- NOTE: `:Rest curl yank` does not run this hook.
vim.api.nvim_create_autocmd("User", {
  pattern = "RestRequestPre",
  group = vim.api.nvim_create_augroup("rest_nvim_basic_auth", { clear = true }),
  callback = function()
    local req = _G.rest_request
    local values = req and req.headers and req.headers["authorization"]
    if not values then
      return
    end
    for i, value in ipairs(values) do
      local creds = value:match("^%s*[Bb]asic%s+(.-)%s*$")
      if creds and creds ~= "" then
        local user, pass = creds:match("^([^:]*):(.*)$")
        if not user then
          user, pass = creds:match("^(%S+)%s+(.+)$")
        end
        if user then
          values[i] = "Basic " .. vim.base64.encode(user .. ":" .. pass)
        end
      end
    end
  end,
})

-- Keymaps --------------------------------------------------------------------
local map = function(lhs, rhs, desc)
  vim.keymap.set("n", lhs, rhs, { desc = desc })
end
map("<leader>Rs", "<cmd>Rest run<cr>", "Send request")
map("<leader>Rl", "<cmd>Rest last<cr>", "Re-run last request")
map("<leader>Ro", "<cmd>Rest open<cr>", "Open result pane")
map("<leader>Re", "<cmd>Rest env select<cr>", "Select env file")
map("<leader>RE", "<cmd>Rest env show<cr>", "Show env file")
map("<leader>Rc", "<cmd>Rest cookies<cr>", "Edit cookies")
map("<leader>RL", "<cmd>Rest logs<cr>", "Open logs")
map("<leader>Ry", "<cmd>Rest curl yank<cr>", "Yank as curl")
