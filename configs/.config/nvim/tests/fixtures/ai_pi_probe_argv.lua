-- Emit actual session.args output for the installed-Pi model-free probe.
local root = vim.env.AI_PI_PROBE_ROOT
local agent_dir = vim.env.AI_PI_PROBE_AGENT_DIR
local output = vim.env.AI_PI_PROBE_ARGV_OUTPUT
local mode = vim.env.AI_PI_PROBE_MODE
local role = vim.env.AI_PI_PROBE_ROLE
local search_extension = vim.env.AI_PI_PROBE_SEARCH_EXTENSION
assert(root and agent_dir and output and mode and role and search_extension, 'probe argv fixture environment is incomplete')
vim.opt.rtp:append(vim.env.AI_PI_PROBE_PLUGIN_ROOT)

local config = require('ai.config')
config.setup({
  active_profile = 'probe',
  profiles = {
    probe = {
      agent_dir = agent_dir,
      models = {
        chat = { provider = 'nvim-probe-fake', id = 'nvim-pi-probe-fake-model', thinking = 'off' },
        cheap = { provider = 'nvim-probe-fake', id = 'nvim-pi-probe-fake-model', thinking = 'off' },
        expensive = { provider = 'nvim-probe-fake', id = 'nvim-pi-probe-fake-model', thinking = 'off' },
      },
    },
  },
  chat = {
    role = 'chat',
    search_extension = search_extension,
    extension = vim.env.AI_PI_PROBE_COMPANION_EXTENSION,
  },
})

-- Keep probe-only identities in memory: this must not write under the caller's XDG state.
local ids = require('ai.session_ids')
ids.load = function() return nil end
ids.fresh = function(identity)
  assert(identity.profile == 'probe' and identity.agent_dir == vim.uv.fs_realpath(agent_dir))
  return 'nvim-probe-generated-session'
end

local args, err = require('ai.session').args(root, mode, role)
assert(args, err)
assert(vim.fn.writefile({ vim.json.encode(args) }, output) == 0, 'could not write generated probe argv')
