-- Shared setup seam for the opt-in comments workflow and its offline setup smoke.
local M = {}

function M.configure(plugin_root, project_root, profile_root, models_file)
  local setup_fixture = dofile(vim.fs.joinpath(plugin_root, 'tests/fixtures/ai_setup.lua'))
  require('ai').setup(setup_fixture.options(nil, {
    root = profile_root,
    models_file = models_file,
    plugin_root = plugin_root,
  }))
  vim.api.nvim_set_current_dir(project_root)
end

return M
