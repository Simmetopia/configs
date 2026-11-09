-- Local Neovim integration settings. Terminal Pi configuration and credentials remain untouched.
local local_search_entry = vim.fn.expand('~/.pi/agent/tmp/extensions/npm/f35b2129/node_modules/pi-web-search/src/index.ts')
require('ai').setup({
  active_profile = 'lego',
  profiles = {
    lego = {
      agent_dir = vim.fn.expand('~/.local/share/pi-nvim/lego'),
      models_file = vim.fn.expand('~/.pi/agent/models.json'),
      models = {
        chat = { provider = 'lego-openai', id = 'gpt-6.1-sol-2026-09-29', thinking = 'high' },
        cheap = { provider = 'lego-openai', id = 'gpt-6-luna-2026-09-22', thinking = 'high' },
        expensive = { provider = 'lego-anthropic', id = 'eu.anthropic.claude-opus-5-5', thinking = 'medium' },
      },
    },
  },
  mappings = { project = '<leader>aip', chat = '<leader>aic', help = '<leader>aih' },
  help = { role = 'cheap', bang_role = 'expensive' },
  comments = { prompt_role = 'expensive' },
  chat = { role = 'chat', search_extension = local_search_entry },
})
