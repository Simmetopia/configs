vim.pack.add({
  'https://github.com/mfussenegger/nvim-dap',
  'https://github.com/rcarriga/nvim-dap-ui',
  'https://github.com/nvim-neotest/nvim-nio',
  'https://github.com/theHamsta/nvim-dap-virtual-text',
  'https://github.com/mfussenegger/nvim-dap-python',
})

local dap = require('dap')
local dapui = require('dapui')

-- Resolve the Python interpreter used to launch the debug adapter.
-- Prefers the active virtualenv (where databricks-connect / debugpy live),
-- then a project-local .venv/venv, then mise, then system python.
local function python_path()
  local venv = os.getenv('VIRTUAL_ENV')
  if venv and venv ~= '' then
    return venv .. '/bin/python'
  end

  local cwd = vim.fn.getcwd()
  for _, dir in ipairs({ '.venv', 'venv' }) do
    local candidate = cwd .. '/' .. dir .. '/bin/python'
    if vim.fn.executable(candidate) == 1 then
      return candidate
    end
  end

  if vim.fn.executable('mise') == 1 then
    local resolved = vim.fn.trim(vim.fn.system({ 'mise', 'which', 'python' }))
    if vim.v.shell_error == 0 and resolved ~= '' then
      return resolved
    end
  end

  return vim.fn.exepath('python3') ~= '' and vim.fn.exepath('python3') or 'python'
end

-- Collect Databricks credentials for the debug session.
-- The SDK's unified auth needs a HOST; it only checks DATABRICKS_HOST, not
-- DATABRICKS_SERVER_HOSTNAME (that var is only used by our Alembic env.py).
-- We derive HOST from whatever is available so the token auth path resolves.
-- Read the `host` from the [DEFAULT] profile of ~/.databrickscfg as a fallback
-- when no host env var is present (e.g. nvim launched outside a shell that
-- exported DATABRICKS_*).
local function host_from_cfg()
  local path = (os.getenv('HOME') or '') .. '/.databrickscfg'
  local f = io.open(path, 'r')
  if not f then
    return nil
  end
  local in_default = false
  local result
  for line in f:lines() do
    local section = line:match('^%s*%[(.-)%]%s*$')
    if section then
      in_default = (section:upper() == 'DEFAULT')
    elseif in_default then
      local value = line:match('^%s*host%s*=%s*(.+)%s*$')
      if value then
        result = value:gsub('%s+$', '')
        break
      end
    end
  end
  f:close()
  return result
end

local function databricks_env()
  local env = {}

  local host = os.getenv('DATABRICKS_HOST')
  if not host or host == '' then
    local hostname = os.getenv('DATABRICKS_SERVER_HOSTNAME')
    if hostname and hostname ~= '' then
      hostname = hostname:gsub('^https?://', ''):gsub('/+$', '')
      host = 'https://' .. hostname
    end
  end
  if not host or host == '' then
    host = host_from_cfg()
  end
  if host and host ~= '' then
    env.DATABRICKS_HOST = host
  end

  local token = os.getenv('DATABRICKS_TOKEN')
  if token and token ~= '' then
    env.DATABRICKS_TOKEN = token
  end

  return env
end

-- nvim-dap-python wires up the debugpy adapter and default configurations.
require('dap-python').setup(python_path())

-- Custom launch configs for Python, incl. Databricks Connect on the open buffer.
table.insert(dap.configurations.python, 1, {
  type = 'python',
  request = 'launch',
  name = 'Databricks Connect: run open file',
  program = '${file}',
  console = 'integratedTerminal',
  cwd = '${workspaceFolder}',
  justMyCode = false, -- step into pyspark / databricks libs when needed
  env = vim.tbl_extend('force', {
    -- Ensure Spark/Databricks logging goes to the console.
    PYSPARK_PYTHON = python_path(),
    PYSPARK_DRIVER_PYTHON = python_path(),
  }, databricks_env()),
})

table.insert(dap.configurations.python, 2, {
  type = 'python',
  request = 'launch',
  name = 'Python: run open file (justMyCode)',
  program = '${file}',
  console = 'integratedTerminal',
  cwd = '${workspaceFolder}',
})

-- UI setup
dapui.setup()
require('nvim-dap-virtual-text').setup()

-- Open/close the UI automatically with the debug session.
dap.listeners.before.attach.dapui_config = function() dapui.open() end
dap.listeners.before.launch.dapui_config = function() dapui.open() end
dap.listeners.before.event_terminated.dapui_config = function() dapui.close() end
dap.listeners.before.event_exited.dapui_config = function() dapui.close() end

-- Signs
vim.fn.sign_define('DapBreakpoint', { text = '●', texthl = 'DiagnosticError', linehl = '', numhl = '' })
vim.fn.sign_define('DapBreakpointCondition', { text = '◆', texthl = 'DiagnosticWarn', linehl = '', numhl = '' })
vim.fn.sign_define('DapLogPoint', { text = '◆', texthl = 'DiagnosticInfo', linehl = '', numhl = '' })
vim.fn.sign_define('DapStopped', { text = '▶', texthl = 'DiagnosticOk', linehl = 'Visual', numhl = '' })
vim.fn.sign_define('DapBreakpointRejected', { text = '○', texthl = 'DiagnosticError', linehl = '', numhl = '' })

-- Keybindings (<leader>d prefix)
local map = vim.keymap.set
map('n', '<F5>', function() dap.continue() end, { desc = 'DAP: Continue/Start' })
map('n', '<F10>', function() dap.step_over() end, { desc = 'DAP: Step Over' })
map('n', '<F11>', function() dap.step_into() end, { desc = 'DAP: Step Into' })
map('n', '<F12>', function() dap.step_out() end, { desc = 'DAP: Step Out' })

map('n', '<leader>dc', function() dap.continue() end, { desc = 'DAP: Continue/Start' })
map('n', '<leader>db', function() dap.toggle_breakpoint() end, { desc = 'DAP: Toggle Breakpoint' })
map('n', '<leader>dB', function()
  dap.set_breakpoint(vim.fn.input('Breakpoint condition: '))
end, { desc = 'DAP: Conditional Breakpoint' })
map('n', '<leader>dl', function()
  dap.set_breakpoint(nil, nil, vim.fn.input('Log point message: '))
end, { desc = 'DAP: Log Point' })
map('n', '<leader>do', function() dap.step_over() end, { desc = 'DAP: Step Over' })
map('n', '<leader>di', function() dap.step_into() end, { desc = 'DAP: Step Into' })
map('n', '<leader>dO', function() dap.step_out() end, { desc = 'DAP: Step Out' })
map('n', '<leader>dr', function() dap.repl.toggle() end, { desc = 'DAP: Toggle REPL' })
map('n', '<leader>dL', function() dap.run_last() end, { desc = 'DAP: Run Last' })
map('n', '<leader>dt', function() dap.terminate() end, { desc = 'DAP: Terminate' })
map('n', '<leader>du', function() dapui.toggle() end, { desc = 'DAP: Toggle UI' })
map({ 'n', 'v' }, '<leader>de', function() dapui.eval() end, { desc = 'DAP: Eval expression' })

-- Databricks Connect: run the open buffer directly under the debugger.
map('n', '<leader>dd', function()
  dap.run(dap.configurations.python[1])
end, { desc = 'DAP: Databricks Connect run open file' })
