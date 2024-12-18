---@diagnostic disable: missing-fieldslsp
local M = {
  "neovim/nvim-lspconfig",
  lazy = false,
  dependencies = {
    -- LSP Support
    { "williamboman/mason-lspconfig.nvim" },
    { "williamboman/mason.nvim" },

    -- Neodev
    { "folke/neodev.nvim" },

    -- Lint
    { "mfussenegger/nvim-lint" },
  },
}

local ensure_installed = {
  'cssls',
  'dockerls',
  'eslint',
  'html',
  'jsonls',
  'lua_ls',
  'ts_ls',
  'vimls',
  'yamlls'
}

M.config = function()
  require("neodev").setup()
  local lspconfig = require("lspconfig")
  local lsp_defaults = lspconfig.util.default_config

  lsp_defaults.capabilities = vim.tbl_deep_extend("force",
    lsp_defaults.capabilities,
    require('cmp_nvim_lsp').default_capabilities()
  )

  local on_attach = function(client, bufnr)
    local opts = { buffer = bufnr, remap = false }

    vim.keymap.set("n", "gd", function()
      vim.lsp.buf.definition()
    end, opts)
    vim.keymap.set("n", "K", function()
      vim.lsp.buf.hover()
    end, opts)
    vim.keymap.set("n", "<leader>vd", function()
      vim.diagnostic.open_float()
    end, opts)
    vim.keymap.set("n", "[d", function()
      vim.diagnostic.goto_next()
    end, opts)
    vim.keymap.set("n", "]d", function()
      vim.diagnostic.goto_prev()
    end, opts)
    vim.keymap.set("n", "<leader>vca", function()
      vim.lsp.buf.code_action()
    end, opts)
    vim.keymap.set("n", "<leader>vrn", function()
      vim.lsp.buf.rename()
    end, opts)
    vim.keymap.set("i", "<C-h>", function()
      vim.lsp.buf.signature_help()
    end, opts)
  end

  local default_setup = function(server)
    lspconfig[server].setup({
      on_attach = on_attach,
    })
  end

  local lua_setup = function()
    lspconfig.lua_ls.setup({
      on_attach = on_attach,
      settings = {
        Lua = {
          diagnostics = {
            globals = { "vim" },
          },
          hint = { enable = true }
        },
      },
    })
  end

  local tailwindcss_setup = function()
    lspconfig.tailwindcss.setup({
      on_attach = on_attach,
      init_options = {
        userLanguages = {
          elixir = "html-eex",
          eelixir = "html-eex",
          heex = "html-eex",
        },
      },
    })
  end


  local eslint_setup = function()
    lspconfig.eslint.setup({
      root_dir = lspconfig.util.root_pattern(
        "package.json",
        "yarn.lock",
        ".git"
      ),
      flags = {
        debounce_text_changes = 500,
      },
      on_attach = function(client, bufnr)
        client.server_capabilities.documentFormattingProvider = true
      end
    })
  end

  require("mason").setup({})
  require("mason-lspconfig").setup({
    ensure_installed = ensure_installed,
    handlers = {
      default_setup,
      ["lua_ls"] = lua_setup,
      ["tailwindcss"] = tailwindcss_setup,
      ["eslint"] = eslint_setup
    },
  })

  vim.opt.completeopt = { 'menu', 'menuone', 'noselect' }

  -- Dadbod stuff
  local autocomplete_group = vim.api.nvim_create_augroup('vimrc_autocompletion', { clear = true })
  vim.api.nvim_create_autocmd('FileType', {
    pattern = { 'sql', 'mysql', 'plsql' },
    callback = function()
      require 'cmp'.setup.buffer({
        sources = {
          { name = 'vim-dadbod-completion' },
          { name = 'buffer' }
        },
      })
    end,
    group = autocomplete_group,
  })

  -- Lint
  require("lint").linters_by_ft = {
    markdown = { "markdownlint" },
  }

  vim.api.nvim_create_autocmd({ "BufWritePost" }, {
    callback = function()
      require("lint").try_lint()
    end,
  })
end

return M
