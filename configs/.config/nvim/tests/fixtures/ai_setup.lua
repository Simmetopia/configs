local M = {}

function M.options(overrides, fixture)
  fixture = fixture or {}
  local root = fixture.root or assert(vim.env.AI_TEST_PROFILE_DIR, 'AI_TEST_PROFILE_DIR must be set by tests/run_ai.sh')
  local search_entry = root .. '/search-package/src/index.ts'
  local models_file = fixture.models_file or root .. '/models-source.json'
  local plugin_root = fixture.plugin_root or vim.fn.getcwd()
  local function profile(agent_dir, models)
    return { agent_dir = agent_dir, models_file = models_file, models = models }
  end
  local options = {
    active_profile = 'workbench',
    profiles = {
      workbench = profile(root .. '/agents/workbench', {
        chat = { provider = 'lego-openai', id = 'gpt-6.1-sol-2026-09-29', thinking = 'high' },
        cheap = { provider = 'lego-openai', id = 'gpt-6-luna-2026-09-22', thinking = 'high' },
        expensive = { provider = 'lego-anthropic', id = 'eu.anthropic.claude-opus-5-5', thinking = 'medium' },
      }),
      studio = profile(root .. '/agents/studio', {
        chat = { provider = 'fixture-openai', id = 'arbitrary-chat-model', thinking = 'off' },
      }),
    },
    mappings = { project = '<leader>aip', chat = '<leader>aic', help = '<leader>aih' },
    help = { role = 'cheap', bang_role = 'expensive', context_lines = 30, selection_bytes = 200 * 1024 },
    comments = { enabled = true, prompt_role = 'cheap' },
    chat = { role = 'chat', search_extension = search_entry, extension = vim.fs.joinpath(plugin_root, 'lua/ai/pi-extension/index.ts') },
    limits = {
      startup_ms = 10000,
      shutdown_ms = 3000,
      record_bytes = 1024 * 1024,
      file_bytes = 2 * 1024 * 1024,
      history_lines = 350,
      response_bytes = 20000,
      restored_bytes = 20000,
      handled_markers = 1000,
    },
    ui = { width = 0.8, height = 0.75, border = 'single', conceallevel = 0 },
  }
  return vim.tbl_deep_extend('force', options, overrides or {})
end

return M
