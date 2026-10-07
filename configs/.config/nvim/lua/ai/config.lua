-- Defaults describe policy, not credentials. Override these in require('ai').setup().
local M = {}
local source = debug.getinfo(1, 'S').source:sub(2)
local package_root = vim.fs.dirname(source)

M.defaults = {
  executable = 'pi',
  models = {
    luna = { provider = 'lego-openai', id = 'gpt-6-luna-2026-09-22' },
    sol = { provider = 'lego-openai', id = 'gpt-6.1-sol-2026-09-29' },
    opus = { provider = 'lego-anthropic', id = 'eu.anthropic.claude-opus-5-5', thinking = 'medium' },
  },
  mappings = { project = '<leader>aip', chat = '<leader>aic' },
  comments = { enabled = true, prompt_tier = 'opus' },
  chat = {
    tier = 'sol',
    search_extension = 'npm:pi-web-search@1.6.0',
    extension = vim.fs.joinpath(package_root, 'pi-extension', 'index.ts'),
  },
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
M.options = vim.deepcopy(M.defaults)

function M.setup(options)
  local result = vim.tbl_deep_extend('force', vim.deepcopy(M.defaults), options or {})
  for _, tier in ipairs({ result.comments.prompt_tier, result.chat.tier, 'luna', 'opus' }) do
    local model = result.models[tier]
    assert(model and type(model.provider) == 'string' and type(model.id) == 'string',
      'AI: invalid model tier ' .. tostring(tier))
  end
  M.options = result
  return result
end

return M
