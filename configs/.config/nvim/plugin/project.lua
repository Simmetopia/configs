-- Zoxide project switcher: pick a project -> :cd + layout restore + events.
-- Entry point only; implementation lives in lua/project/. House style for
-- plugin/ files: vim.pack.add() first, then require, then setup.
vim.pack.add({ 'https://github.com/ibhagwan/fzf-lua' }) -- no-op guard (declared in plugin/fzf_lua.lua)
require('project').setup()
