vim.loader.enable()

vim.g.loaded_netrw = 1
vim.g.loaded_netrwPlugin = 1
vim.g.mapleader = " "
vim.g.maplocalleader = " "

require("globals")
require("keybinds")

-- Build step hooks — must be defined before vim.pack.add() calls
vim.api.nvim_create_autocmd('PackChanged', {
  callback = function(ev)
    local name = ev.data.spec.name
    local kind = ev.data.kind

    if name == 'nvim-treesitter' and (kind == 'install' or kind == 'update') then
      vim.cmd('TSUpdate')
    end

    if name == 'markdown-preview.nvim' and kind == 'install' then
      local dir = vim.fn.stdpath('data') .. '/site/pack/core/opt/markdown-preview.nvim/app'
      vim.fn.system({ 'npm', 'install', '--prefix', dir })
    end

    if name == 'LuaSnip' and kind == 'install' then
      local dir = vim.fn.stdpath('data') .. '/site/pack/core/opt/LuaSnip'
      vim.fn.system({ 'make', '-C', dir, 'install_jsregexp' })
    end
  end
})
