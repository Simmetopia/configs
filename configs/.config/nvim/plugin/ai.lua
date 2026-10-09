-- Local integration settings. The reusable plugin and defaults live under lua/ai/.
-- Tiers mirror what pi can use; see `pi --list-models` (~/.pi/agent/models.json).
require('ai').setup({
  models = {
    -- itminds-llm-portal: text-only, 100K context, no thinking
    -- mistral = { provider = 'itminds-llm-portal', id = 'mistral-medium-3.5' },
    expensive = { provider = 'itminds-llm-portal', id = 'deepseek-v4-flash' },
    chat = { provider = 'itminds-llm-portal', id = 'glm-5.2' },
    cheap = { provider = 'itminds-llm-portal', id = 'qwen3.8' },
  },
  mappings = { project = '<leader>aip', chat = '<leader>aic' },
})
