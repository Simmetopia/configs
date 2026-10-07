-- Local integration settings. The reusable plugin and defaults live under lua/ai/.
require('ai').setup({
  models = {
    luna = { provider = 'lego-openai', id = 'gpt-6-luna-2026-09-22' },
    opus = { provider = 'lego-anthropic', id = 'eu.anthropic.claude-opus-5-5', thinking = 'medium' },
  },
  mappings = { project = '<leader>aip', chat = '<leader>aic' },
})
