-- Run: nvim --headless -u NONE -l tests/ai_config.lua
vim.opt.rtp:append(vim.fn.getcwd())
local config = require('ai.config')
local fixture = dofile('tests/fixtures/ai_setup.lua')

local function fails(options, pattern)
  local ok, err = pcall(config.setup, options)
  assert(not ok, 'expected invalid configuration to fail')
  if pattern then assert(tostring(err):find(pattern, 1, true), tostring(err)) end
end

local options = fixture.options()
fails({}, 'active_profile')
fails({ active_profile = 'missing', profiles = { workbench = options.profiles.workbench } }, 'active_profile')
fails({ active_profile = 'workbench', profiles = {} }, 'profiles')

local arbitrary = fixture.options()
arbitrary.active_profile = 'research-lab'
arbitrary.profiles['research-lab'] = vim.deepcopy(arbitrary.profiles.workbench)
arbitrary.profiles['research-lab'].agent_dir = arbitrary.profiles.workbench.agent_dir .. '-research'
local normalized = config.setup(arbitrary)
assert(normalized.active_profile == 'research-lab')
assert(config.profile('research-lab').agent_dir == arbitrary.profiles['research-lab'].agent_dir)
assert(not pcall(config.profile, 'unknown'))

local fallback = fixture.options()
fallback.profiles.workbench.models = { chat = { provider = 'p', id = 'chat-model', thinking = 'high' } }
local fallback_profile = config.setup(fallback).profiles.workbench
assert(vim.deep_equal(fallback_profile.models.cheap, fallback_profile.models.chat))
assert(vim.deep_equal(fallback_profile.models.expensive, fallback_profile.models.chat))
fallback_profile.models.chat.id = 'changed'
assert(fallback_profile.models.cheap.id == 'chat-model', 'omitted roles must be independent descriptors')

local present = fixture.options()
present.profiles.workbench.models.cheap = { provider = 'present-provider' }
fails(present, 'cheap')
present = fixture.options()
present.profiles.workbench.models.expensive = { id = 'present-id' }
fails(present, 'expensive')

local invalid = fixture.options()
invalid.profiles.workbench.models.chat = 'chat-model'
fails(invalid, 'chat')
invalid = fixture.options()
invalid.profiles.workbench.models.chat.thinking = 'invalid'
fails(invalid, 'thinking')
invalid = fixture.options()
invalid.profiles.workbench.models.chat.provider = ''
fails(invalid, 'provider')
invalid = fixture.options()
invalid.profiles.workbench.models.chat.id = ''
fails(invalid, 'id')
invalid = fixture.options()
invalid.active_profile = ''
fails(invalid, 'active_profile')

local thinking_levels = { 'off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max' }
for _, level in ipairs(thinking_levels) do
  local candidate = fixture.options()
  candidate.profiles.workbench.models.chat.thinking = level
  assert(config.setup(candidate).profiles.workbench.models.chat.thinking == level)
end
local omitted_thinking = fixture.options()
omitted_thinking.profiles.workbench.models.chat.thinking = nil
assert(config.setup(omitted_thinking).profiles.workbench.models.chat.thinking == 'off')
local false_thinking = fixture.options()
false_thinking.profiles.workbench.models.chat.thinking = false
fails(false_thinking, 'thinking')

print('AI config tests passed')
