-- Run: bash tests/run_ai.sh ai_comments_storage
vim.opt.rtp:append(vim.fn.getcwd())
local fixture = dofile('tests/fixtures/ai_setup.lua')
require('ai.config').setup(fixture.options())
local storage = require('ai.comments.storage')
local profile_root = assert(vim.env.AI_TEST_PROFILE_DIR)
local root = profile_root .. '/storage-project-a'
local other_root = profile_root .. '/storage-project-b'
vim.fn.mkdir(root, 'p')
vim.fn.mkdir(other_root, 'p')

-- load_is_shared_live_root_table
local canonical = assert(vim.uv.fs_realpath(root))
local first = storage.load(root)
local second = storage.load(canonical)
assert(first == second, 'a canonical root must return its original live handled table')
first['aabb'] = true
assert(storage.load(root)['aabb'] == true)

-- root_tables_are_distinct
assert(storage.load(other_root) ~= first, 'different canonical roots must not share handled state')

-- existing_file_format_and_limit_retained
local persisted = { '1122', '3344' }
local loaded_root = profile_root .. '/storage-existing-file'
vim.fn.mkdir(loaded_root, 'p')
local loaded_canonical = assert(vim.uv.fs_realpath(loaded_root))
local loaded_path = vim.fn.stdpath('state') .. '/ai-comments/' .. vim.fn.sha256(loaded_canonical) .. '.json'
vim.fn.mkdir(vim.fn.fnamemodify(loaded_path, ':h'), 'p', '0700')
assert(vim.fn.writefile({ vim.json.encode(persisted) }, loaded_path) == 0)
local loaded = storage.load(loaded_root)
assert(loaded['1122'] and loaded['3344'])
local project = { root = loaded_root, handled = loaded }
storage.remember(project, 'manual-1')
assert(not loaded['manual-1'], 'manual conversation identities are not marker fingerprints')
assert(table.concat(vim.fn.readfile(loaded_path), '\n') == vim.json.encode(persisted),
  'manual conversation identities must not change the persisted marker file')
storage.remember(project, '5566')
local decoded = vim.json.decode(table.concat(vim.fn.readfile(loaded_path), '\n'))
local decoded_set = {}
for _, key in ipairs(decoded) do decoded_set[key] = true end
assert(#decoded == 3 and decoded_set['1122'] and decoded_set['3344'] and decoded_set['5566'],
  'existing JSON array format must be retained')

local capped_root = profile_root .. '/storage-at-capacity'
vim.fn.mkdir(capped_root, 'p')
local capped_canonical = assert(vim.uv.fs_realpath(capped_root))
local capped_path = vim.fn.stdpath('state') .. '/ai-comments/' .. vim.fn.sha256(capped_canonical) .. '.json'
vim.fn.mkdir(vim.fn.fnamemodify(capped_path, ':h'), 'p', '0700')
assert(vim.fn.writefile({ '["preserved"]' }, capped_path) == 0)
local capped = storage.load(capped_root)
for index = 1, require('ai.config').options.limits.handled_markers do
  capped[string.format('%08x', index)] = true
end
storage.remember({ root = capped_root, handled = capped }, 'ffffffff')
assert(capped['ffffffff'], 'the live handled table must still retain the new in-memory marker')
assert(table.concat(vim.fn.readfile(capped_path), '\n') == '["preserved"]',
  'over-capacity persistence must leave the prior on-disk bytes unchanged')

print('AI comments storage tests passed')
