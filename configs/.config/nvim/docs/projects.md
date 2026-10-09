# Project switching

Use **`<leader>sp`**, **`:ProjectSwitch`**, or **`:Projects`**.
`:ProjectSwitch /path/to/project` switches directly (directory completion supported). The picker uses `vim.ui.select`
(and therefore the configured fzf-lua UI) to show existing directories from
`zoxide query --list --score`, sorted by score. Only scores **strictly greater
than 1.5** qualify; zoxide tracks directories, so results need not be Git roots.
Canceling the picker does nothing.

Configuration lives in `plugin/projects.lua`; implementation is in
`lua/projects.lua`.

Before changing the working directory, switching:

- refuses if any non-terminal buffer has unsaved changes, including AI prompts;
- stops **all** loaded AI comment/chat workflows, clears pending requests,
  hides their windows, and waits for RPC processes to exit;
- terminates all DAP sessions and closes DAP UI;
- force-disposes all Overseer tasks (including running tasks) and closes its UI;
- stops terminal jobs, including hidden FTerm and LazyGit terminals;
- closes old tabs/windows, deletes old buffers, clears quickfix, and uses `:cd`
  to enter the selected directory;
- records the visit with `zoxide add`.

Persisted AI transcripts/identities are retained. Stopped AI workflows do not
restart in the background; use `:AIRestart` / `:AIChatRestart` when returning
if you want to resume them. Deleting old file buffers lets LSP clients detach
normally rather than forcibly killing shared language servers.

Cleanup waits up to 10 seconds (configurable with `shutdown_ms`). On cleanup
failure or timeout, cwd remains unchanged, although already-stopped extensions
stay stopped. There is deliberately no force-switch that discards unsaved work.

## Other extensions

There is no universal Neovim API for closing every plugin's sessions.
Override cleanup in `plugin/projects.lua` through `setup({ listeners = ... })`:

```lua
require('projects').setup({
  listeners = {
    -- Built-in names: ai, dap, overseer, terminals.
    -- A function replaces that default; false disables it.
    overseer = function(ctx)
      local os = package.loaded.overseer
      if not os then return end
      os.close()
      for _, task in ipairs(os.list_tasks()) do task:dispose(true) end
    end,
    my_extension = function(ctx)
      -- ctx.old / ctx.new identify the previous and selected directories.
      local ext = package.loaded['my-extension']
      if not ext then return end
      ext.stop_all()
      return function() return ext.is_idle() end
    end,
  },
})
```

Unspecified defaults remain enabled. Custom listeners run before cwd changes;
return an idle predicate to wait for asynchronous shutdown. Errors abort the
switch. Disabling cleanup does not preserve buffers: workspace reset still
removes old buffers and windows, so leave terminal cleanup enabled.

Alternatively, register additional cleanup for extensions at runtime:

```lua
require('projects').register_cleanup('my-extension', function(ctx)
  local extension = package.loaded['my-extension']
  if not extension then return end
  extension.stop_all()
  -- Optional predicate: the switch waits until it returns true.
  return function() return extension.is_idle() end
end)
```

`User ProjectSwitchPre` runs after cleanup requests, before the wait and before
buffers/cwd change. `User ProjectSwitchPost` runs after the switch. Both events'
`data` contains `{ old = old_directory, new = new_directory }`. These are `User`
autocommand events, separate from the `:ProjectSwitch` user command.

Offline tests:

```sh
nvim --headless -u NONE -l tests/projects.lua
bash tests/run_ai.sh
```
