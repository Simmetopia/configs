-- Non-billable setup smoke for the opt-in live comments caller.
local plugin_root = assert(vim.uv.fs_realpath(vim.fn.getcwd()))
vim.opt.rtp:append(plugin_root)
local profile_root = assert(vim.env.AI_TEST_PROFILE_DIR)
local project = vim.fs.joinpath(profile_root, 'live-setup-project')
local models_file = vim.fs.joinpath(profile_root, 'models-source.json')
local function argv_count()
  if vim.fn.filereadable(vim.env.AI_TEST_ARGV_LOG) == 0 then return 0 end
  return #vim.fn.readfile(vim.env.AI_TEST_ARGV_LOG)
end
local argv_before = argv_count()
assert(vim.fn.mkdir(project, 'p') == 1)
local caller_setup = dofile(vim.fs.joinpath(plugin_root, 'tests/fixtures/ai_comments_live_caller.lua'))
caller_setup.configure(plugin_root, project, vim.fs.joinpath(profile_root, 'live-setup-profile'), models_file)

local config = require('ai.config').options
assert(config.active_profile == 'workbench')
assert(config.profiles.workbench.agent_dir == vim.fs.joinpath(profile_root, 'live-setup-profile/agents/workbench'))
assert(config.profiles.workbench.models_file == models_file)
assert(config.chat.extension == vim.fs.joinpath(plugin_root, 'lua/ai/pi-extension/index.ts'))
assert(vim.fn.filereadable(config.chat.extension) == 1)
assert(argv_count() == argv_before, 'setup smoke must not spawn Pi')
assert(require('ai.rpc').is_idle(), 'setup smoke must not start an RPC process')
vim.api.nvim_set_current_dir(plugin_root)
print('AI live comments setup smoke passed (fake fixture, no Pi process)')
