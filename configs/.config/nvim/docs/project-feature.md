# Project switch + zoxide feature

Design and implementation spec. Gives neovim a zoxide-backed project
switcher, plus a well-defined answer to: *what happens to AI sessions when I
switch projects?* Same house style as `docs/ai.md`: architecture, module map,
switch lifecycle, AI interaction, commands, implementation steps, tests,
safety.

> **Status: implemented.** Run `bash tests/run_project.sh` (offline, isolated
> zoxide DB + XDG state, no pi needed). The two substantive deviations from
> the design below are flagged inline: the event-payload delivery mechanism
> (callback `ev.data`, not `vim.v.event`) and the corrected zoxide score
> regex.

## Start here

- `plugin/project.lua` – the single entry point (setup, commands, mappings, autocmds).
- `lua/project/` – implementation modules (see module map).
- `lua/ai/project.lua` + `lua/ai/comments/init.lua` – the two small AI hooks
  this feature fires, kept behind an opt-in config flag.
- [AI plugin docs](ai.md) for how project roots and sessions already work.

Implementation notes are **not** here; the design is. Each module lists its own
"verify" command so an agent can implement module by module. The rule for
`plugin/` files in this config: `vim.pack.add()` first, then `require(...)`,
then `setup()`, then mappings/commands. Follow `plugin/overseer.lua` and
`plugin/fzf_lua.lua` as templates.

## Current state (facts, verified)

- `zoxide` 0.9.9 installed via mise; DB: `~/.local/share/zoxide/db.zo` (~175 dirs, frecency-ranked).
- `.config/nvim` is a symlink to the `configs` dotfiles git repo
  (`/home/simmetopia/configs/configs/.config/nvim`); the config itself is a
  git checkout, not a symlinked plugin.
- Nvim-side project navigation was absent before this feature (pickers were
  `fzf_lua.files`, projects meant shell `z`/`:cd`); `:Z`/`<leader>zp` now
  provide it (see Usage).
- `DirChanged` is already used by `plugin/overseer.lua` to preload task cache.
- `exrc` loads per-project `.nvim.lua`/`.nvimrc` when a file in that dir opens (must stay set in `lua/globals.lua`).
- AI plugin: project root = `vim.fs.root(buf, '.git')` with `getcwd()` fallback
  (`lua/ai/project.lua`). Roots resolve from the **current buffer**, not cwd.
  Per-root state: up to four Pi RPC processes (`edit:opus`, `question:luna`,
  `chat:sol`), identities persisted under `stdpath('state')/ai-sessions/`, so
  AI project context survives nvim restarts independent of cwd.
- `hidden=true`, `undofile` in `~/.vim/undodir`, no session/layout plugin.

## Goals

- Pick a project inside nvim via a zoxide-order picker (fzf-lua, already installed).
- On pick: change cwd to the project, restore that project's saved layout (if any),
  bump its zoxide rank, and fire a project-switch event.
- Give a **precise, deterministic answer** for what happens to the AI plugin's
  sessions on switch, and let the user opt into pruning/pausing Pi for projects
  they leave.
- Everything pluggable: the switcher itself never starts/stops Pi; it changes
  cwd + layout + fires events. The AI plugin decides what to do.

## Non-goals

- A telescope/telescope-exclusive UI (we standardize on fzf-lua; the bridge is
  UI-agnostic, so a telescope adapter is trivial later).
- Replacing `z` in the shell, or syncing shell/tmux cwd (noted as optional
  follow-up in Safety).
- Auto-restarting/killing Pi processes from the switcher (see AI interaction).
- Committing session snapshots to the dotfiles repo (they live in state).

## Architecture / module map

```text
plugin/project.lua              entry: setup, commands, mappings, autocmds
lua/project/
  init.lua                      public API: setup/switch/pick/current
  zoxide.lua                    CLI bridge: query/add/remove/list, parse, env override
  picker.lua                    fzf-lua glue: prompt, live query, preview
  switch.lua                    the switch pipeline (cd, session load, events, wiring)
  sessions.lua                  per-root layout save/restore (:mksession-style)
  git.lua                       root normalization + repo metadata for preview
lua/ai/
  project.lua                   [+select(root): re-target the "selected" root]   (small diff)
  comments/init.lua             [+prune_others(root) / stop_all(root)]           (small diff)
  init.lua                      [opt-in User ProjectSwitchPost hook]             (small diff)
```

Modules register **no** autocmds at import time; `require('project').setup()`
owns all global registrations (same doctrine as the AI plugin).

### Public API

```lua
local project = require('project')

project.setup(opts)                     -- idempotent; owns registrations
project.current() -> root               -- getcwd() realpath
project.switch(root, opts)              -- the pipeline; no-op if root == current()
project.pick(opts)                      -- open the zoxide picker
project.abort_switch()                  -- veto the in-flight switch (from a Pre listener)
project.zoxide.add(path) / remove(path) -- one-line rank helpers (thick wrappers)
```

Commands and mappings (defaults, configurable):

| Command | Action |
|---|---|
| `:Z [terms]` | zoxide picker; optional live query terms  |
| `:ZAdd [path]` | `zoxide add` (defaults to cwd) |
| `:ZPrune` | multi-select stale dirs → `zoxide remove` |
| `:ZSave` | save current project's layout snapshot |
| `:ZThis` | switch to current buffer's project root (git root normalize) |

| Map | Action |
|---|---|
| `<leader>zp` | `project.pick()` |
| `<leader>zc` | plain `:cd` via zoxide picker, no session restore |
| `<leader>zs` | `:ZSave` |

### Default config

```lua
require('project').setup({
  zoxide = { bin = 'zoxide', data_dir = nil, resolve_symlinks = false, exclude = {} },
  git = { normalize_root = true },              -- pick a subdir? jump to nearest .git ancestor
  sessions = {
    enabled = true,
    dir = vim.fn.stdpath('state') .. '/project-sessions',
    autosave = true,                            -- on VimLeavePre, non-blocking
    auto_restore = true,                        -- restore layout on switch when a snapshot exists
    prune = 20,                                 -- keep newest N snapshots (save-order LRU)
  },
  picker = { preview = true },
  notify = true,
})
```

## The switch pipeline

Entry: `project.switch(target, opts)`.

1. **Guard.** `target = vim.uv.fs_realpath(target)`; if `target == current()` (or
   cwd is inside `target` and `normalize_root=false`), no-op with an info
   notify. Prevents re-entrancy from `DirChanged`.
2. **Pre event.** `nvim_exec_autocmds('User', { pattern = 'ProjectSwitchPre',
   modeline = false, data = { old = old, new = target } })`. Listeners may veto
   by calling `require('project').abort_switch()` (the pipeline checks that
   flag after each step).
3. **Ordering matters:** switch *cwd first*, then sessions, then AI.
   `vim.cmd.cd(target)` fires `DirChanged` → overseer preloads tasks for the
   new cwd (`plugin/overseer.lua` handles this; keep it).
4. **Session restore.** If `sessions.auto_restore` and a snapshot exists for
   `target`, restore the buffer layout **after** `:cd` (see
   `lua/project/sessions.lua` for the dirty-buffer rule). Never restore if any
   current buffer is modified.
5. **Rank bump.** `zoxide add target` (explicit switch ⇒ worth a new rank tick;
   we deliberately do *not* `zoxide add` on every `:cd`, only here and in `:ZAdd`).
6. **Post event.** `nvim_exec_autocmds('User', { pattern = 'ProjectSwitchPost',
   data = { old = old, new = target, session_restored = bool } })`. This is the
   hook the AI plugin consumes (see below).

Event contract: fields `old`, `new` (realpath strings), `session_restored`
(bool). Fired through `nvim_exec_autocmds` so any plugin can opt in without
touching `project`.

**Delivery note (this 0.13-dev build).** The payload is delivered to Lua
callbacks as the callback's argument table — `ev.data.old`, `ev.data.new` —
not via `vim.v.event`, which comes through empty for `User` events here (and
the build also rejects `group = -1` to `nvim_exec_autocmds`, so callers pass
explicit group/pattern pairs instead). Vimscript `:command` handlers echoing
`v:event` show `{}` for the same datapoints. `project` never relies on
`vim.v.event`; the AI hook reads `ev.data.new/.old`. If a future nvim build
restores `v:event` population, that path stays working because the fields are
also present in `ev.data`.

### `lua/project/zoxide.lua`

- One thin `os_capture` helper: `vim.system({ bin, ...args }, { env = env })`
  with `env` merging `config.zoxide.data_dir` into `_ZO_DATA_DIR` (so tests and
  the picker can use an isolated DB without touching the user's).
- `M.list(terms)` → array of `{ path, score }`, ordered by score desc.
  `zoxide query -l -s` prints lines like ` 152.0 /home/...`; parse with
  `^%s*(%d+%.?%d*)%s+(.+)$`. NOTE: the spec originally wrote
  `^(%s*(%d+%.?%d*)%s+)(.+)$`, whose *nested* group returns three captures and
  silently shoved the score into `path`; the implemented regex is the
  two-group form (leading `%s*` kept outside the capture). Filter
  `config.zoxide.exclude` and stats (`vim.loop.fs_stat`) so deleted dirs are
  hidden and can be pruned.
- `M.add(path)`, `M.remove(path)`: `zoxide add PATHS...` / `zoxide remove PATHS...`
- `M.resolve(path)`: `fs_realpath` + (if `resolve_symlinks`) keep realpath,
  else keep the zoxide-stored spelling. Used to dedupe picker entries.

### `lua/project/picker.lua` (fzf-lua glue)

- Feed fzf-lua a **plain path list** from `M.list()` (not the `score path`
  lines) to avoid placeholder-quoting bugs, then preview via a Lua functor:

```lua
local fzf = require('fzf-lua')
fzf.fzf_exec(paths, {
  prompt = 'Project> ',
  preview = preview and function(entry)
    local p = vim.fn.shellescape(entry)
    return 'if git -C ' .. p .. ' rev-parse --git-dir >/dev/null 2>&1; then '
      .. 'git -C ' .. p .. ' status --short --branch; else ls -1 ' .. p .. '; fi'
  end or nil,
  actions = { default = function(sel) project.switch(vim.F.if_nil(sel[1], '')) end },
})
```

- `:Z <terms>` passes terms into `M.list(terms)` → `zoxide query --list TERMS`
  (frecency + substring narrowing survives, keeps ranking usable).
- Live query extension: use fzf's `--query` with the terms; real per-keystroke
  re-query is optional and deferred (175 entries need no live backend).
- Reset/ignore `cfg.exclude` matching the configs/state dirs only if the user
  configures it; show everything by default.

### `lua/project/sessions.lua`

- Snapshot dir: `vim.fn.stdpath('state') .. '/project-sessions'` (state, never
  the repo; `chmod 0700` on `mkdir`). Filename: `sha256(root) .. '.vim'` —
  same hashing idiom as `lua/ai/session_ids.lua`.
- Save (`M.save(root)`): `vim.cmd('mksession! ' .. file)` after ensuring the
  dir exists. Runs on `VimLeavePre` when `autosave` (non-blocking, no prompt).
- Restore (`M.restore(root)`): guard first — if any listed buffer is
  `modified`, notify and skip. Otherwise `source` the file, then
  `vim.cmd.cd(root)` again (mksession embeds an old cwd; ours must win).
- Pruning: keep newest N snapshots (default 20); drop the rest on save. The
  ordering is a save-order LRU tracked in a `.order` sidecar (basename +
  `vim.uv.hrtime()` epoch written on every save), not file mtime — this
  build's `:mksession` writes a coarse cached timestamp (byte-identical
  sec+nsec for same-second writes) so mtime is not a reliable order.
- `mksession` snapshots contain absolute paths, incl. potentially sensitive
  buffer names: that's why they live in `0700` state and are never committed
  to the dotfiles repo.

### `lua/project/git.lua`

- `M.nearest(root, depth)` → nearest ancestor containing `.git` / `HEAD`
  (bounded, default depth 8). Used by `normalize_root` and by the picker to
  show a "↑ this is inside <repo>" marker so the user learns to pick roots,
  not subdirs.
- `M.meta(path)` → `{ root = git root, branch, dirty }` for preview/statusline (optional).

## What happens to the AI plugin on switch (the crux)

Two hard facts drive this section:

1. The AI plugin keys projects by canonical **root from the current buffer**
   (`roots.current()`), not cwd.
2. Each project keeps its own Pi processes, persisted by session-id. They keep
   running (and can keep editing/bash-ing) after you leave the project.

Therefore **a project switcher's only correct job w.r.t. AI is: re-target the
"selected" root and optionally stop the Pi processes you no longer want** —
never to kill/restart from inside the switcher's own code.

The switcher fires `ProjectSwitchPost`. The AI plugin opts in. Nothing about
the zoxide feature changes unless the user enables the AI integration.

### Scenario matrix

| Scenario | Behavior (after feature) |
|---|---|
| Switch to a git-root project, then open one of its files | `roots.current()` returns the new root from the buffer; `<leader>aip` shows the **new** conversation. Views of other projects are already hidden on toggle. No code needed. |
| Switch via `:cd` but current buffer is still the old project's file (**the trap**) | WITHOUT the hook: `roots.current()` keeps returning the old root → toggling shows the **old** conversation. WITH the `ProjectSwitchPost` hook → `roots.select(new)` fixes `selected`, so `<leader>aip` opens the new project. This is the minimal diff the feature must ship. |
| Picked dir is not a git root (e.g. `code/lego`, `configs/tlp-profiles`) | Root falls back to `getcwd()` — that dir becomes its own AI project keyed by realpath. If `normalize_root` is on, the switcher `:cd`s to the nearest `.git` ancestor first, collapsing everything under one AI project. Trade-off documented: frecency `zoxide add` then also bumps that root. |
| Two zoxide entries point at the same repo (symlink or subdir) | `M.resolve()` dedupes in the picker; AI already uses realpath keys, so no duplicate sessions. |
| Old project still open in hidden buffers with Pi running | **Default: do nothing.** Pi for the old project keeps running in the background; it will keep streaming/editing whatever it was mid-way through. That is often *desired* (long build/refactor completes while you review something else) but has a risk: it may edit/`bash` files in a repo you've left. |
| Switch while old project's AI is mid-response | Same as above (default: leave running). If the user opts in to `pause_active_on_switch`, the hook calls `stop_all(new)` (keep-based: stops every root except the one just entered, which covers the left project) — queued work for the old project is lost; `:AIRestart` resumes the persisted session. Explicit opt-in only. |
| `prune_others` opt-in | `comments.prune_others(new)` stops Pi sessions for **all** roots except `new` (one call, respects `p.project` map). Saves memory/CPU when many projects are resident. Queues for pruned projects are discarded; their handled-marker fingerprints are retained. |
| Full nvim restart mid-project-hopping | Unchanged: AI sessions resume automatically (Pi persists them; `ai-sessions/` holds identities). Nvim *layout* (what `sessions.lua` restores) is orthogonal and composes with it. |
| AI session persists across switches of *cwd only* | Keyed by root, so switching cwd between two repos is already two separate conversations. `:AINew` still only resets the current root's edit session. |

### AI integration diff (opt-in, small)

In `lua/ai/config.lua` defaults (kept opt-in, but shipped with `integrate` on;
see Answer to Open Question 1):

```lua
project = { integrate = true, prune_others = false, pause_active_on_switch = false },  -- prune_others wins if both true
```

In `lua/ai/init.lua` `setup()` the whole registration is guarded by
`config.project.integrate` (no listener at all when off), still inside the
existing `AI` augroup:

```lua
if config.project and config.project.integrate then
  vim.api.nvim_create_autocmd('User', { group = group, pattern = 'ProjectSwitchPost', callback = function(ev)
    local new, old = ev.data and ev.data.new, ev.data and ev.data.old
    if not new then return end
    require('ai.project').select(new, old)          -- re-target selected
    if config.project.prune_others then
      require('ai.comments').prune_others(new)      -- stop Pi for every other root
    elseif config.project.pause_active_on_switch then
      require('ai.comments').stop_all(new)          -- stop Pi for the left project
    end
  end })
end
```

`lua/ai/project.lua` gains `M.select(root, old)` (stores both; `old` drives the
comments trap rule below):

```lua
function M.select(root, old)  -- re-target the conversation shown by <leader>aip
  selected, selected_old = root, old
end
function M.selected()         -- current selected root (or nil)
  return selected
end
```

`lua/ai/comments/init.lua` gains two tiny entry points, both **keep-based**
(stop every root ≠ the switched-to `keep`, which also covers the left project;
the spec's `stop_all(old)` prose is resolved in favor of the keep-parameter
superset):

- `prune_others(keep)`: `stop_project(root)` + drop from the `projects` map for
  every `root ~= keep` (queues discarded, fingerprints retained, views hidden).
- `stop_all(keep)`: `stop_project(root)` for every `root ~= keep`, but keep the
  map resident (`:AIRestart` resumes the persisted session).

Plus a `current()` trap rule: the explicit project-switch target wins only when
the buffer's own root is nil/equal/the root just left; any *other* root means
the user opened an unrelated project's file, and the buffer wins (self-healing).

## Usage

Nothing to configure to start (defaults are sensible; zoxide itself must be
installed, as it already is here). If you *don't* want the AI re-target, set
`project = { integrate = false }` in `lua/ai/config.lua` before
`require('ai').setup()`.

- `:Z [terms]` / `<leader>zp` — zoxide-order picker; type to narrow (frecency +
  substring). Preview shows `git status --short --branch` for repos, `ls`
  otherwise, and an `↑ inside <repo>` marker for subdir entries. Enter switches.
- `<leader>zc` — plain `:cd` via the same picker: no session restore, no rank
  bump, no events. Handy when you just want the cwd for a moment.
- `:ZAdd [path]` — `zoxide add` (defaults to cwd), nudging rank.
- `:ZPrune` — fzf with `--multi`; select stale dirs and `zoxide remove` them.
- `:ZSave` — `:mksession!` snapshot for the current project (also autosaves on
  exit). `:ZThis` — jump to the current buffer's git root.

Switching lifecycle in one breath: `:Z` → pick → cwd moves (overseer preloads
new tasks) → layout restores if a clean snapshot exists → zoxide rank bumps →
`ProjectSwitchPost` fires → with `integrate=true` the AI conversation
re-targets (`<leader>aip` now talks about the new project).

## Implementation steps (run in order)

Each step ends with a verify command. An agent should implement these one at a
time; the design above is the contract.

1. **Bootstrap modules.** Add `lua/project/init.lua` exporting `setup/current/
   switch/pick`, plus stub `zoxide.lua`, `picker.lua`, `switch.lua`, `sessions.lua`,
   `git.lua`. Add `plugin/project.lua` with `vim.pack.add({ 'https://github.com/ibhagwan/fzf-lua' })` (already in tree — keep as a no-op guard), `require('project').setup()`.
   Verify: `nvim --headless -c 'lua print(require("project").current())' -c 'qa'`.

2. **`zoxide.lua` bridge.** Implement `os_capture`, `list/add/remove/resolve`.
   Verify in isolation: `nvim --headless -u NONE -l -`
   (`local z=require('project.zoxide'); print(#z.list())`). Use a temp
   `_ZO_DATA_DIR` in dev to avoid polluting the real DB.

3. **`picker.lua`.** Add `project.pick()` via `fzf_exec` with the score-sorted
   list and the `preview` functor. Verify: `:Z` opens fzf-lua, preview shows
   `git status --short --branch` for repos and `ls` otherwise, spaceless and
   space-containing dirs both preview correctly.

4. **`switch.lua` pipeline + events.** Implement guard, `ProjectSwitchPre/Post`
   (`nvim_exec_autocmds`), `cd`, session restore call, `zoxide add`. Add an
   ephemeral listener in dev to print both events: `:Z` on a repo shows
   `old`/`new`. Verify no-op for same root: `:Z` back to the current dir logs
   info and fires nothing.

5. **`sessions.lua`.** Save/restore/prune with the dirty-buffer guard.
   Verify: `:ZSave`, then `:q`, reopen, `:Z` back → layout returns; make a
   buffer modified, switch away → restore skipped with a notify.

6. **`git.lua` + normalize_root.** Verify picking `code/lego/hello` when
   `normalize_root=true` lands in that git root and `project.current()` equals
   it. Verify non-repo dirs (e.g. `configs/tlp-profiles`) just `:cd` as-is.

7. **AI integration.** Apply the config flag, `roots.select`, `prune_others`/
   `stop_all`, and the `ProjectSwitchPost` hook. Verify with `integrate=true`:
   switch into a new repo → `<leader>aip` shows the new root (trap fixed).
   Verify `prune_others`: two resident projects, switch → only `new` keeps Pi
   processes; `:AIStatus` on the old project reports "stopped".

8. **Commands/mappings.** `:Z :ZAdd :ZPrune :ZSave :ZThis` + `<leader>zp/zc/zs`.
   Wire completion (`funclist`/file for `:ZAdd`). Verify each.

9. **Docs.** Update this file's "module map" if structure changed; add a usage
   section and the scenario matrix pointer from `docs/ai.md`.

## Tests

Reuse the existing harness style (`tests/run_ai.sh`, `tests/bin/` mocks).
zoxide is real and fast, so tests run it against an isolated DB.

- `tests/run_project.sh`: runner. Resolves the real zoxide binary via
  `readlink -f "$(command -v zoxide)"` into `_ZO_REAL_BIN`, prepends
  `$PWD/tests/bin` to `PATH`, spawns a disposable `XDG_STATE_HOME` +
  `_ZO_DATA_DIR`, runs the five files below sequentially, then prints
  `project tests passed`.
- `tests/bin/zoxide`: sandbox shim. Forces `_ZO_DATA_DIR` to a temp dir if
  unset, then `exec`s the real binary resolved by the runner (errors loudly if
  `_ZO_REAL_BIN` is unset). The Lua bridge also merges `config.zoxide.data_dir`
  into the child env, so tests can point at a fresh DB without the wrapper.
- Coverage (one file per module):
  - `tests/project_zoxide.lua`: seed an isolated DB (repo + nested + a dir
    deleted afterward) → parse/order/filter, deleted-dir hidden, term narrowing,
    `exclude` filtering, `resolve` symlink spelling vs realpath, `remove`
    roundtrip.
  - `tests/project_git.lua`: `.git` dir / `.git` file (worktree) / bare `HEAD`
    detection, bounded upward search (deep-only nesting → nil), `is_repo`,
    `meta` root/branch/dirty on a real `git init` repo.
  - `tests/project_sessions.lua`: save/has/restore roundtrip, dirty-buffer
    guard (restore returns false, buffer untouched), per-root sha256 keying,
    save-order LRU prune (`.order` sidecar, `uv.hrtime()` epoch) + just-saved
    protection.
  - `tests/project_switch.lua`: full switch A→B (trailing slash), event data
    `old/new/session_restored` on Pre/Post, no-op on same root (false, no
    events), subdir→git-root normalize, plain dir passthrough, `cd_only`
    (no events/rank), veto via `abort_switch()` (cwd untouched, pre only),
    unknown path → nil, rank bumps visible in the isolated DB.
  - `tests/project_ai.lua`: `require('ai').setup()` registers the hook; full
    switch re-targets `ai.project.selected()`; comments' trap rule creates the
    project for the *new* root while a buffer still points at the old root's
    file; an unrelated project's buffer wins (self-healing); `stop_all` keeps
    the map resident; `prune_others` hides/drops every non-keep project
    (via monkeypatched `view.new`/`view.hide`). Never spawns pi.
- Each test: `nvim --headless -u NONE -l test.lua` in a disposable dir, mirroring
  `tests/run_ai.sh`'s isolation discipline.

## Safety boundaries and limitations

- The switcher never spawns/signals Pi. AI lifecycle is the AI plugin's,
  opt-in, documented above.
- `zoxide add` is only called on explicit switch or `:ZAdd`, never on every
  `:cd` — keeps the DB honest and avoids rank inflation from session restore.
- `:cd` changes `grepprg`, LSP root, `cwd`-conditioned overseer tasks and dap
  launch cwds. That is *expected* here (it's what making "switch" mean
  something is), but session restore must happen with the right cwd first, and
  the dirty-buffer guard must hold even under `hidden=true`.
- `mksession` snapshots contain absolute paths and buffer contents references;
  live in `0700` state dirs, never in the dotfiles repo. Treat as private.
- Default policy on leaving a project with busy Pi: sessions keep running.
  Users enabling `prune_others`/`pause_active_on_switch` accept lost queues and
  possibly a background edit interrupted mid-write; that is their explicit
  choice.
- Multiple nvim instances in one project: last `:ZSave` wins; acceptable.
  Session autosave on `VimLeavePre` must be non-blocking and silent.
- Optional future: mirror the picked cwd into a parent tmux/shell session so
  shell `z`/`git` stay in sync after nvim closes. Out of scope here; a
  `ProjectSwitchPost` listener could `tmux send-keys -t . "cd -q {new}"` later.
- Unsupported assumption to verify during implementation: that `:cd` fires
  `DirChanged` in this 0.13-dev build exactly once per switch; if the pipeline
  causes a double-fire (e.g. cwd → session restore → cwd), the overseer
  preload and `ProjectSwitchPre`/`Post` must still be idempotent.

## Resolved open questions

- **`integrate` default: ON.** As the design recommended, and it shipped
  enabled. It only influences which root `<leader>aip` targets when the buffer
  doesn't already live there — it never touches sessions/processes.
  Destructive flags (`prune_others`, `pause_active_on_switch`) stay off.
- **History switching (`<leader>zo`): deferred.** Stick to the picker + `:ZAdd`
  rank nudges; oldfiles-style project history can reuse the same
  `ProjectSwitchPre` veto path later without design changes.
- **tmux cwd-sync listener: deferred.** A `ProjectSwitchPost` listener that
  `tmux send-keys -t . "cd -q <new>"` remains a drop-in `plugin/` extra; not
  shipped to keep the feature self-contained.
- **Event payload delivery** (a *new* finding, not in the original questions):
  Lua callbacks must read `ev.data`, never `vim.v.event`, on this build — see
  the delivery note under the switch pipeline.
