-- Optional live check: AI_TEST_BASE=<disposable parent dir> nvim --headless -u NONE -l tests/ai_comments_live.lua
-- Uses real Pi and provider credentials; creates and removes one disposable project.
local config = vim.fn.getcwd()
vim.opt.rtp:append(config)
local base = assert(vim.env.AI_TEST_BASE, 'Set AI_TEST_BASE to a disposable directory')
local dir = vim.fs.joinpath(base, 'ai-comments-live-' .. vim.uv.hrtime())
assert(vim.fn.isdirectory(base) == 1, 'AI_TEST_BASE does not exist')
assert(vim.fn.mkdir(dir, 'p') == 1)
vim.api.nvim_set_current_dir(dir)

require('ai').setup()
local path = vim.fs.joinpath(dir, 'example.py')
vim.fn.writefile({ 'value = 1', '# AI! Change value = 1 to value = 2 in this file. Leave this comment intact for Neovim to clean up.' }, path)
vim.cmd.edit(path)
local buf = vim.api.nvim_get_current_buf()
vim.bo[buf].filetype = 'python'

local function lines()
  return vim.fn.readfile(path)
end

local function show_failure(label)
  vim.cmd.AIToggle()
  local conversation = vim.api.nvim_buf_get_lines(vim.api.nvim_get_current_buf(), 0, -1, false)
  vim.cmd.AIToggle()
  print(label .. ' failed; saved file: ' .. vim.inspect(lines()))
  print('conversation: ' .. table.concat(conversation, '\n'))
  print('Project retained for inspection: ' .. dir)
  error(label .. ' did not finish')
end

local function await(label, predicate)
  if not vim.wait(120000, predicate, 100) then show_failure(label) end
end

vim.cmd.write()
await('AI! edit and marker cleanup', function()
  local saved = lines()
  return saved[1] == 'value = 2' and #saved == 1
end)
assert(vim.deep_equal(vim.api.nvim_buf_get_lines(buf, 0, -1, false), { 'value = 2' }))
assert(not vim.bo[buf].modified)
print('Live AI! edit: value changed, marker removed, buffer synchronized')

vim.api.nvim_buf_set_lines(buf, -1, -1, false, { '# What value is assigned here? AI?' })
vim.cmd.write()
await('AI? answer and marker cleanup', function()
  local saved = lines()
  return #saved == 1 and saved[1] == 'value = 2'
end)
assert(vim.deep_equal(vim.api.nvim_buf_get_lines(buf, 0, -1, false), { 'value = 2' }))
assert(not vim.bo[buf].modified)
print('Live AI? question: marker removed; file unchanged')

vim.cmd.AIToggle()
local conversation = table.concat(vim.api.nvim_buf_get_lines(vim.api.nvim_get_current_buf(), 0, -1, false), '\n')
assert(conversation:find('Settled: example.py:2 AI? ', 1, true), 'question did not settle')
vim.cmd.AIToggle()

vim.api.nvim_buf_set_lines(buf, -1, -1, false,
  { '# AI!! Change value = 2 to value = 3 in this file. Leave this comment intact for Neovim to clean up.' })
vim.cmd.write()
await('AI!! edit and marker cleanup', function()
  local saved = lines()
  return #saved == 1 and saved[1] == 'value = 3'
end)
assert(vim.deep_equal(vim.api.nvim_buf_get_lines(buf, 0, -1, false), { 'value = 3' }))
assert(not vim.bo[buf].modified)
print('Live AI!! edit: value changed, marker removed, buffer synchronized')

vim.api.nvim_buf_set_lines(buf, -1, -1, false, { '# What value is assigned here? AI??' })
vim.cmd.write()
await('AI?? answer and marker cleanup', function()
  local saved = lines()
  return #saved == 1 and saved[1] == 'value = 3'
end)
assert(vim.deep_equal(vim.api.nvim_buf_get_lines(buf, 0, -1, false), { 'value = 3' }))
assert(not vim.bo[buf].modified)
vim.cmd.AIToggle()
conversation = table.concat(vim.api.nvim_buf_get_lines(vim.api.nvim_get_current_buf(), 0, -1, false), '\n')
assert(conversation:find('Settled: example.py:2 AI?? ', 1, true), 'Opus question did not settle')
vim.cmd.AIToggle()
print('Live AI?? question: marker removed; file unchanged')

vim.cmd.AIStop()
vim.wait(500)
vim.api.nvim_set_current_dir(config)
vim.api.nvim_buf_delete(buf, { force = true })
assert(vim.fn.delete(dir, 'rf') == 0)
print('Live comment workflow passed')
