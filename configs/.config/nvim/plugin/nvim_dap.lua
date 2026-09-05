vim.pack.add({ "https://github.com/mfussenegger/nvim-dap", { src = "https://github.com/igorlfs/nvim-dap-view", version = vim.version.range("1.*") },
  'https://codeberg.org/mfussenegger/nvim-dap-python' })

local dap = require("dap")
local dv = require("dap-view")

--------------------------------------------------------------------------------
-- UI: nvim-dap-view
--------------------------------------------------------------------------------
dv.setup({
  winbar = {
    show = true,
    -- "console" gets its own section so the debuggee terminal lives inside the
    -- dap-view split instead of a separate floating/side window.
    sections = { "watches", "scopes", "exceptions", "breakpoints", "threads", "repl", "console" },
    default_section = "scopes",
    controls = {
      enabled = true, -- clickable play/step/stop buttons in the winbar
    },
  },
  windows = {
    -- Fraction of the screen for the UI split (position defaults to "below").
    size = 0.30,
  },
  -- Inline variable values as virtual text next to the source line while stopped.
  virtual_text = {
    enabled = true,
  },
})

--------------------------------------------------------------------------------
-- Signs (breakpoint / stopped-line gutter markers)
--------------------------------------------------------------------------------
vim.fn.sign_define("DapBreakpoint", { text = "●", texthl = "DiagnosticError", linehl = "", numhl = "" })
vim.fn.sign_define("DapBreakpointCondition", { text = "◆", texthl = "DiagnosticWarn", linehl = "", numhl = "" })
vim.fn.sign_define("DapLogPoint", { text = "◆", texthl = "DiagnosticInfo", linehl = "", numhl = "" })
vim.fn.sign_define("DapBreakpointRejected", { text = "○", texthl = "DiagnosticHint", linehl = "", numhl = "" })
vim.fn.sign_define("DapStopped",
  { text = "▶", texthl = "DiagnosticOk", linehl = "Visual", numhl = "DiagnosticOk" })

--------------------------------------------------------------------------------
-- Auto open/close the UI with the session lifecycle
--------------------------------------------------------------------------------
dap.listeners.before.attach["dap-view"] = function() dv.open() end
dap.listeners.before.launch["dap-view"] = function() dv.open() end
dap.listeners.before.event_terminated["dap-view"] = function() dv.close() end
dap.listeners.before.event_exited["dap-view"] = function() dv.close() end

-- Elixir
dap.adapters.mix_task = {
  type = 'executable',
  command = vim.fn.stdpath("data") .. '/mason/bin/elixir-ls-debugger',
  args = {}
}

dap.configurations.elixir = {
  {
    type = "mix_task",
    name = "mix test",
    task = 'test',
    taskArgs = { "--trace" },
    request = "launch",
    startApps = true, -- for Phoenix projects
    projectDir = "${workspaceFolder}",
    requireFiles = {
      "test/**/test_helper.exs",
      "test/**/*_test.exs"
    }
  },
  {
    -- Start the app under the debugger (easiest option — no separate
    -- running node needed). Runs `mix run --no-halt` so long-running
    -- apps (GenServers, etc.) stay up. Set breakpoints and go.
    type = "mix_task",
    name = "launch app (mix run)",
    request = "launch",
    task = "run",
    taskArgs = { "--no-halt" },
    startApps = true,
    projectDir = "${workspaceFolder}",
    exitAfterTaskReturns = false, -- app keeps running, don't end session
  },
  {
    -- Start a Phoenix server under the debugger.
    type = "mix_task",
    name = "launch phx.server",
    request = "launch",
    task = "phx.server",
    projectDir = "${workspaceFolder}",
    -- Interpreting all modules hurts Phoenix/Ecto/Cowboy perf; limit it.
    debugAutoInterpretAllModules = false,
    debugInterpretModulesPatterns = { "MyApp*", "MyAppWeb*" },
    -- phx.server returns control to caller, so don't exit the session.
    exitAfterTaskReturns = false,
  },
  {
    -- Attach to a running OTP node over distribution.
    -- Start your app with a node name + cookie, e.g.:
    --   iex --sname myapp --cookie mysecret -S mix
    --   iex --name myapp@127.0.0.1 --cookie mysecret -S mix phx.server
    -- The remote app must have OTP `debugger` loadable (add `:debugger`
    -- to :extra_applications) and be compiled with debug_info + strip_beams=false.
    type = "mix_task",
    name = "attach to running node",
    request = "attach",
    projectDir = "${workspaceFolder}",
    -- Prompt for the remote node name each time so you can target
    -- whatever node you launched (sname or full name).
    remoteNode = function()
      return vim.fn.input("Remote node: ", "myapp@" .. vim.fn.hostname())
    end,
    -- Only interpret your own app modules to avoid perf issues in deps.
    debugAutoInterpretAllModules = false,
    debugInterpretModulesPatterns = { "MyApp*", "MyAppWeb*" },
    env = {
      -- The local DAP node needs its own name + the SAME cookie as the
      -- remote node to join the cluster. Adjust the cookie to match yours.
      ELS_ELIXIR_OPTS = "--sname elixir_ls_dap --cookie mysecret",
    },
  },
}


-- python
require("dap-python").setup("uv")

-- Parse a `KEY=value` env file into a table. Used to inject the Databricks
-- bundle environment (`.databricks/.databricks.env`) into debug sessions so
-- that Databricks Connect auth resolves the same way it does under `uv run`
-- in the terminal (which runs inside the bundle context).
local function read_env_file(path)
  local env = {}
  local f = io.open(path, "r")
  if not f then
    return env
  end
  for line in f:lines() do
    local key, value = line:match("^%s*([%w_]+)%s*=%s*(.*)$")
    if key and value then
      value = value:gsub("^['\"](.*)['\"]$", "%1")
      env[key] = value
    end
  end
  f:close()
  return env
end

table.insert(require("dap").configurations.python, {
  type = "python",
  request = "launch",
  name = "Debug with databricks-connect",
  program = "${file}",
  console = "integratedTerminal",
  justMyCode = true,
  -- Use the project's venv interpreter directly. (Routing through
  -- `uv run` breaks debugpy: it appends its launcher path as an arg and
  -- `uv run` treats it as an unknown subcommand.) The .venv is populated
  -- by `uv sync`, so it has all deps; the only thing that was missing was
  -- the correct environment, injected below.
  pythonPath = function()
    return vim.fn.getcwd() .. "/.venv/bin/python"
  end,
  cwd = "${workspaceFolder}",
  -- The real fix: inject the Databricks bundle-generated environment.
  -- `uv run` in the terminal inherits `.databricks/.databricks.env` (which
  -- holds DATABRICKS_HOST + DATABRICKS_METADATA_SERVICE_URL OAuth auth),
  -- but nvim-dap-python only auto-loads `./.env` (which has a stale/PAT
  -- token) -> auth error. Load the bundle env so auth matches the terminal.
  env = function()
    local env = read_env_file(vim.fn.getcwd() .. "/.databricks/.databricks.env")
    -- The bundle env uses `metadata-service` auth, which points at an
    -- ephemeral local token server started by the Databricks VS Code
    -- extension. That server isn't running under nvim-dap (connection
    -- refused on 127.0.0.1:<port>), so force PAT auth using the token
    -- already present in the env file instead.
    env.DATABRICKS_AUTH_TYPE = "pat"
    env.DATABRICKS_METADATA_SERVICE_URL = nil
    return env
  end,
})
require('dap-python').test_runner = 'pytest'

--------------------------------------------------------------------------------
-- Keymaps
--------------------------------------------------------------------------------
-- Convention:
--   * Function keys mimic IDE debugger controls (F5/F9/F10/F11...).
--   * <leader>d... is the discoverable namespace (shows up in `<leader>sk` /
--     which-key style pickers via the `desc` fields).
--------------------------------------------------------------------------------
local map = function(lhs, rhs, desc, modes)
  vim.keymap.set(modes or "n", lhs, rhs, { desc = desc, silent = true })
end

local dpy = require("dap-python")
local widgets = require("dap.ui.widgets")

-- ── Core stepping / flow (IDE-style function keys) ──────────────────────────
map("<F5>", dap.continue, "DAP: Continue / Start")
map("<F17>", dap.terminate, "DAP: Stop (Shift-F5)") -- Shift+F5 on many terminals
map("<F10>", dap.step_over, "DAP: Step Over")
map("<F11>", dap.step_into, "DAP: Step Into")
map("<F23>", dap.step_out, "DAP: Step Out") -- Shift+F11
map("<F9>", dap.toggle_breakpoint, "DAP: Toggle Breakpoint")

-- ── <leader>d: session control ──────────────────────────────────────────────
map("<leader>dc", dap.continue, "DAP: Continue / Start")
map("<leader>dn", dap.step_over, "DAP: Step Over (next)")
map("<leader>di", dap.step_into, "DAP: Step Into")
map("<leader>do", dap.step_out, "DAP: Step Out")
map("<leader>dC", dap.run_to_cursor, "DAP: Run to Cursor")
map("<leader>dp", dap.pause, "DAP: Pause")
map("<leader>dg", dap.goto_, "DAP: Go to line (skip execution)")
map("<leader>dk", dap.up, "DAP: Up the call stack")
map("<leader>dj", dap.down, "DAP: Down the call stack")
map("<leader>dR", dap.restart, "DAP: Restart session")
map("<leader>dx", dap.terminate, "DAP: Terminate session")
map("<leader>dl", dap.run_last, "DAP: Run Last configuration")
map("<leader>dh", widgets.hover, "DAP: Hover value", { "n", "v" })
map("<leader>dP", widgets.preview, "DAP: Preview value", { "n", "v" })

-- ── Breakpoints ─────────────────────────────────────────────────────────────
map("<leader>db", dap.toggle_breakpoint, "DAP: Toggle Breakpoint")
map("<leader>dB", function()
  dap.set_breakpoint(vim.fn.input("Breakpoint condition: "))
end, "DAP: Conditional Breakpoint")
map("<leader>dL", function()
  dap.set_breakpoint(nil, nil, vim.fn.input("Log point message: "))
end, "DAP: Log Point")
map("<leader>dX", dap.clear_breakpoints, "DAP: Clear all breakpoints")

-- ── UI (dap-view) ───────────────────────────────────────────────────────────
map("<leader>dv", function() dv.toggle() end, "DAP: Toggle UI (dap-view)")
map("<leader>de", function() dv.jump_to_view("exceptions") end, "DAP: Exceptions view")
map("<leader>dw", function()
  dv.add_expr() -- add word/selection under cursor as a watch
end, "DAP: Watch expression under cursor", { "n", "v" })
map("<leader>dr", function() dv.jump_to_view("repl") end, "DAP: REPL view")
map("<leader>ds", function() dv.jump_to_view("scopes") end, "DAP: Scopes view")
map("<leader>dt", function() dv.jump_to_view("threads") end, "DAP: Threads view")

-- ── Frames / scopes float widgets ───────────────────────────────────────────
map("<leader>df", function() widgets.centered_float(widgets.frames) end, "DAP: Frames (float)")
map("<leader>dS", function() widgets.centered_float(widgets.scopes) end, "DAP: Scopes (float)")

-- ── Python (nvim-dap-python) test helpers ───────────────────────────────────
-- Namespaced under <leader>dT to avoid a prefix clash with <leader>dt (threads).
map("<leader>dTm", function() dpy.test_method() end, "DAP-py: Debug test method")
map("<leader>dTc", function() dpy.test_class() end, "DAP-py: Debug test class")
map("<leader>dTs", function() dpy.debug_selection() end, "DAP-py: Debug selection", { "v" })

--------------------------------------------------------------------------------
-- Convenience commands
--------------------------------------------------------------------------------
vim.api.nvim_create_user_command("DapScopesFloat", function()
  widgets.centered_float(widgets.scopes)
end, { desc = "Floating window with current scopes" })
