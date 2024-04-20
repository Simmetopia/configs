---@diagnostic disable: missing-fields
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
  'tailwindcss',
  'tsserver',
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
    vim.keymap.set("n", "<leader>f", function()
      vim.lsp.buf.format()
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
        if client.server_capabilities.documentFormattingProvider then
          local au_lsp = vim.api.nvim_create_augroup("eslint_lsp", { clear = true })
          vim.api.nvim_create_autocmd("BufWritePre", {
            pattern = "*",
            callback = function()
              vim.lsp.buf.format({ async = false })
            end,
            group = au_lsp,
          })
        end
      end
    })
  end

  require("mason").setup({})
  require("mason-lspconfig").setup({
    ensure_installed = ensure_installed,
    handlers = {
      default_setup,
      ["lua_ls"] = lua_setup,
      ["eslint"] = eslint_setup
    },
  })

  vim.opt.completeopt = { 'menu', 'menuone', 'noselect' }

  local cmp = require("cmp")
  local cmp_select = { behavior = cmp.SelectBehavior.Select }
  cmp.setup({
    sources = {
      { name = 'path' },
      { name = 'nvim_lsp', keyword_length = 1 },
      { name = 'buffer',   keyword_length = 3 },
    },
    mapping = cmp.mapping.preset.insert({
      ["<C-p>"] = cmp.mapping.select_prev_item(cmp_select),
      ["<C-n>"] = cmp.mapping.select_next_item(cmp_select),
      ["<CR>"] = cmp.mapping.confirm({ select = true }),
      ["<Tab>"] = nil,
      ["<S-Tab>"] = nil,
      ["<C-space>"] = cmp.mapping({
        i = function()
          if cmp.visible() then
            cmp.abort()
          else
            cmp.complete()
          end
        end,
        c = function()
          if cmp.visible() then
            cmp.close()
          else
            cmp.complete()
          end
        end,
      }),
    }),
    snippet = {
      expand = function(args)
        require("luasnip").lsp_expand(args.body)
      end,
    },
    window = {
      documentation = cmp.config.window.bordered()
    }
  })

  -- Dadbod stuff
  local autocomplete_group = vim.api.nvim_create_augroup('vimrc_autocompletion', { clear = true })
  vim.api.nvim_create_autocmd('FileType', {
    pattern = { 'sql', 'mysql', 'plsql' },
    callback = function()
      cmp.setup.buffer({
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
