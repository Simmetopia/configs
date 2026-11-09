# Scannable AI Conversation UI Design

**Status: design approved in conversation (approach 1); awaiting written-spec review.**

## Goal

Make the project conversation (`<leader>aip`, `:AIToggle`) and the web chat
(`<leader>aic`) easy to scan. A reader should tell at a glance who said what,
which model answered, which files Pi touched, and whether anything failed,
without reading every line.

Agreed with the user:

- Full-width coloured **bands** for message headers (icon, author, model,
  time); message bodies stay plain markdown underneath.
- **Tool calls** are always-visible, coloured one-line badges.
- **Lifecycle/status lines** (connected, queued, settled, stopping,
  diagnostics…) collapse into foldable `▸ N events` groups.
- Approach: a typed timeline plus a renderer, not pattern-matching on strings.

Assumptions (stated to the user, not contested):

- No new plugin dependencies; extmarks, highlight groups and Tree-sitter only.
- Warnings and errors are never folded away.
- The three-line text header moves into the float border title/footer.
- Workflow behaviour is unchanged: same keymaps, input float, commands,
  queue, sessions and persistence. Only presentation changes, plus the
  additions listed below (`za`/`<Tab>`, `zR`/`zM`).
- Colours link to standard groups (theme-following, Kanagawa today) and are
  overridable.

Out of scope: live spinners/timers, token or cost display, thinking display,
layout changes (split/sidebar), acting on output (apply code, jump to file),
history pickers. These were offered and not chosen as the first priority.

## Target look

```text
┌ Pi project (lego) · ~/configs/configs/.config/nvim ───────────────────┐
│▓▓  You · AI! lua/ai/session.lua:42 ······················ 14:02     │
│Refactor the session cache                                            │
│                                                                      │
│▓▓ 󰚩 Pi · claude-opus-5-5 ································· 14:02     │
│I'll split `session.lua` into…                                        │
│```lua                                                                │
│local M = {}                                                          │
│```                                                                   │
│  [bash] rg session                         ✓ 0.4s                    │
│  [edit] lua/ai/session.lua                 ✓ 0.1s                    │
│  [read] lua/ai/rpc.lua                     ⋯                         │
│▸ 3 events · Settled: lua/ai/session.lua:42                           │
│ Failed/aborted: lua/ai/rpc.lua:9 AI! (marker retained)              │
└ idle · 0 queued │ i prompt · za fold · ^L clear · q hide ────────────┘
```

## Architecture

```
comments/init.lua ─┐                      ┌─ ui/timeline.lua  (pure: entries → lines, marks, ranges)
chat.lua ──────────┼─► ui/view.lua ───────┤
help.lua (via      │   (entries, windows, ├─ ui/highlights.lua (group definitions, icons)
 comments.log) ────┘    keymaps, render)  └─ ui/markdown.lua  (buffer setup, fence helper)
```

| Unit | Purpose | Depends on |
|------|---------|------------|
| `ui/timeline.lua` (new) | Entry constructors and `render(entries, opts) → { lines, marks, groups }`. Pure: no buffers or windows, so it is unit-testable. | `ui/highlights.lua` (names/icons only) |
| `ui/highlights.lua` (new) | Defines `AI*` highlight groups (`default = true` links), applied at setup and on `ColorScheme`. Exposes icon table merged from config. | config |
| `ui/view.lua` (reworked) | Owns entries, buffers, windows, input float, keymaps. `render` writes timeline output and extmarks; title/footer show title/status/help. | timeline, markdown, highlights |
| `ui/markdown.lua` (slimmed) | `setup(buf, win)` as today; `M.message`/`M.decorate` are removed (moved into timeline). | — |
| `ui/tools.lua` (changed) | Returns/updates **tool entries** instead of strings; keeps the same summarising and secret-safety rules. | timeline |

## Timeline entries

All entries are plain tables created by constructors in `ui/timeline.lua`:

```lua
timeline.message({ role = 'user' | 'assistant', text = string,
  label = string?,      -- user: e.g. 'AI! lua/ai/session.lua:42' or 'Prompt'; assistant: nil
  model = string?,      -- short model name, e.g. 'claude-opus-5-5'
  restored = boolean?,  -- history loaded on connect
  time = number? })     -- os.time(); defaults to now, nil allowed for restored history
timeline.tool({ id = string, name = string, detail = string?, state = 'running' | 'done' | 'failed',
  started = number, elapsed = number? })
timeline.event({ level = 'info' | 'warn' | 'error', text = string, time = number? })
```

`view.lua` API (replacing `view.append`/`view.message`):

- `view.add(view, entry)`: append an entry and trim to `limits.history_lines`
  **rendered lines** (dropping whole entries from the front, never half an entry).
- `view.message(view, role, text, opts)`, `view.event(view, level, text)`:
  thin wrappers around `add`.
- `view.tool_start(view, session, event)` / `view.tool_finish(view, session, event)`:
  `tool_start` adds a `running` entry keyed by `toolCallId` (fallback
  `toolName`); `tool_finish` **mutates that entry in place** to
  `done`/`failed` with elapsed time. If there is no matching entry
  (e.g. the display was cleared), it adds a finished entry.
- `view.entries(view)` for tests and `:AIStatus`-style introspection.
  `view.log` is removed.

Model short name: `descriptor.id` with a known region/vendor prefix
(`^%w+%.anthropic%.`) and a trailing date (`%-%d%d%d%d%-%d%d%-%d%d$`) stripped:
`eu.anthropic.claude-opus-5-5 → claude-opus-5-5`,
`gpt-6-luna-2026-09-22 → gpt-6-luna`. Workflows pass it from the active session's `model`.

## Rendering rules

`timeline.render(entries, { stream = string?, stream_model = string?, open = set })`
returns lines plus marks `{ row, col?, end_col?, hl?, line_hl?, virt_text?, virt_pos? }`
and group ranges. `view.render` applies them in one namespace after `nvim_buf_set_lines`.

**Message band.** The header line text is `## <author>` (an ATX heading, so
markdown cannot fold body text into it as a paragraph or setext heading). The
`## ` is covered by an overlay virt-text chunk `▓▓ <icon> `. The whole screen
line gets `line_hl_group` = `AIBandUser`, `AIBandAssistant` or
`AIBandRestored`, with a text `hl_group` at higher priority than Tree-sitter so
heading colours do not override the band. Author text:

- user: `You`, or `You · <label>` (marker label or `Prompt`)
- assistant: `Pi · <model>`; restored: `Pi · restored`; streaming: `Pi · <model> · responding ⋯`

Time (`%H:%M`) is right-aligned virt text in `AIBandMeta`. There is no time for
restored entries without a timestamp. The body lines follow immediately. One
blank line separates the end of a message from the next entry.

**Fence safety.** If a body has an unbalanced code fence (for example after
`protocol.clip` truncation), the renderer appends a closing fence so later
entries are not styled as code. Fenced blocks keep the existing `AICode`
background (today's `CursorLine` fence treatment, moved from `markdown.decorate`).

**Tool badge.** `  [<name>] <detail>` with a right-aligned state chunk: `⋯`
(`AIToolRunning`), `✓ 0.4s` (`AIToolOk`), `✗ 1.2s` (`AIToolFailed`). The name
chunk is coloured by class:

- `AIToolWrite`: `edit`, `write`
- `AIToolExec`: `bash`
- `AIToolRead`: everything else

Tool badges are not inside markdown structure (they always follow a blank line
or another badge, and are prefixed by two spaces plus a bracket), and their
highlights out-prioritise Tree-sitter.

**Event groups.** Consecutive `info` events form a group. A group of one renders
as a single dim line `· <text>`. A larger group renders collapsed as
`▸ N events · <last text>` (`AIFold`) or expanded as `▾ N events` followed by
each `· <text>` (`AIEvent`). `warn`/`error` events always render as standalone
lines with an icon (`` / ``) in `AIEventWarn`/`AIEventError` and break the
surrounding group. Open state is stored per group by the identity of its first
entry, in `view.open`, so it survives re-renders and new appends. These are
renderer-level groups, **not** Vim folds: whole-buffer `set_lines` would
destroy manual folds on every streamed chunk.

**Border title/footer.** Title: ` <view.title> · <root with ~> `. Footer:
` <status()> │ <help> `, updated on each render with `nvim_win_set_config`. If
`ui.border == 'none'`, the same text goes to a one-line `winbar` instead. The
buffer no longer contains header lines (line 1 is the first entry).

**Follow mode** stays as today: follow new output only when the cursor is on
the last line.

## Keymaps (conversation buffer)

Existing `i`, `q`, `<C-l>` are unchanged. New:

- `za` / `<Tab>`: toggle the event group under the cursor (no-op elsewhere).
- `zR` / `zM`: open / close all event groups in this view.

The help strings passed by workflows become compact (`i prompt · za fold · ^L clear · q hide`);
the `:AINew`… command list moves to `:help`-style docs (`docs/ai.md`) to keep
the footer short.

## Workflow call-site mapping

Every `append(p|c, string)` call becomes a typed call:

| Today | Becomes |
|-------|---------|
| `view.message(..., 'Pi', text)` | `message assistant` with session model |
| `view.message(..., 'You', msg)` (chat) | `message user` |
| `view.message(..., 'Previous Pi', …)` / restored history | `message assistant restored` (chat restores `user` too) |
| `'<label> [queued]'` | `event info` |
| `'<label> [sent]'` (project) | **`message user`** with `label` = `AI<kind> <path>:<line>` or `Prompt`, body = marker instruction or prompt text. Replaces the `[sent]` line. |
| `'Connected: …'`, `'Settled: …'`, `'Stopping Pi RPC sessions'`, `'Pi: auto_retry_start'`/`compaction_start` | `event info` |
| `'Assistant stopped: …'`, dialog cancelled, `'Local queue cleared; abort requested'`, `on_diagnostic` | `event warn` |
| `'Failed/aborted: …'`, `'Unmatched Pi command/parse error'`, `'Pi extension error…'`, `'Prompt rejected…'`, `'RPC write failed'`, `'Model error…'`, `'Abort failed…'`, `on_error`, `'… exited …'`, start errors | `event error` |
| `tools.start/finish` strings | `view.tool_start/tool_finish` |

`comments.log(root, text, role, profile_name)` (used by `help.lua`) becomes
`comments.log(root, entry, profile_name)`. `help.lua` builds entries:

- `Selection job …`: `message user` labelled `Selection [role]`
- answers: `message assistant`
- `Applied …` / `No change needed …`: `event info`
- `Conflict …`: `event warn`
- `Failed …`, `Buffer closed …`: `event error`
- tools: `tool_start/tool_finish`

The `Buffer closed…` proposal text keeps its fenced block, as the event text
may be multi-line.

## Configuration

Additions to `ui` defaults in `lua/ai/config.lua`:

```lua
ui = { width = 0.8, height = 0.75, border = 'single', conceallevel = 0,
  icons = { user = '', assistant = '󰚩', warn = '', error = '', running = '⋯', ok = '✓', failed = '✗',
    fold_closed = '▸', fold_open = '▾', band = '▓▓' } },
```

Icons are merged shallowly, so partial overrides work. Users who lack a Nerd
Font set plain ASCII. Highlight groups are overridable with
`vim.api.nvim_set_hl` because all links use `default = true`:

| Group | Default link |
|-------|--------------|
| `AIBandUser` | `DiffAdd` |
| `AIBandAssistant` | `DiffChange` |
| `AIBandRestored` | `CursorLine` |
| `AIBandMeta` | `Comment` |
| `AIToolRead` | `Comment` |
| `AIToolExec` | `DiagnosticInfo` |
| `AIToolWrite` | `DiagnosticWarn` |
| `AIToolRunning` | `DiagnosticHint` |
| `AIToolOk` | `DiagnosticOk` |
| `AIToolFailed` | `DiagnosticError` |
| `AIEvent` | `Comment` |
| `AIEventWarn` | `DiagnosticWarn` |
| `AIEventError` | `DiagnosticError` |
| `AIFold` | `Folded` |
| `AICode` | `CursorLine` |

## Error handling and edge cases

- **Render failure isolation.** If applying a mark fails (for example a stale
  row during rapid updates), wrap the extmark application in `pcall` per mark.
  Text is always written first, so content is never lost to a styling error.
- **History trimming** removes whole entries; a group whose first entry is
  dropped loses its open state, and that is acceptable.
- **`<C-l>`/`:AIClear`/`:AIChatClear`** clear entries and open state. Running
  tool entries are dropped; a later `tool_finish` adds a finished badge (see
  above). This matches today's "display-only" semantics.
- **Narrow windows.** Right-aligned virt text may overlap long header text.
  Header text is truncated with `…` to leave room for the time when
  `strdisplaywidth` exceeds the window width.
- **Profile tokens and ownership** checks in workflows are untouched; only the
  `append` call bodies change.

## Testing

Offline, via `tests/run_ai.sh`:

- **New `tests/ai_timeline.lua`** (pure, no windows):
  - band line text and line highlights for user, assistant and restored
  - model short-name stripping
  - fence auto-closing
  - tool badge classes and running→done mutation keeps a single line
  - info grouping, collapse and expand
  - warn/error break groups and stay visible
  - streaming header
  - trimming keeps whole entries
- **`tests/ai_view.lua`:**
  - after `<C-l>` the buffer is empty instead of 4 header lines
  - footer/title contain status/help, or winbar when `border = 'none'`
  - `za` toggles a group under the cursor
  - resize assertions unchanged
- **`tests/ai_markdown.lua`:** drop `message`/`decorate` assertions. Keep the
  filetype and injection checks by rendering a timeline message into the buffer.
- **`tests/ai_tools.lua`:** assert on entry fields (`name`, `detail`, `state`,
  `elapsed`) instead of strings; keep secret-safety and truncation checks.
- **`tests/ai_chat.lua`, `tests/ai_comments.lua`, `tests/ai_new.lua`,
  `tests/ai_profile_callbacks.lua`:**
  - replace `'### Pi\n\ndone'` with `'## Pi'` plus the body
  - check `view.entries` instead of `view.log` for the abort-failed assertions
  - `Stopped` now lives in the footer, so read it from `nvim_win_get_config(win).footer`
- Manual check: open both views in Kanagawa and with `:colorscheme default`,
  stream a response with a tool call and a failure, and toggle groups.

## Documentation

Update `AI_COMMENTS.md` (keymaps `za`/`<Tab>`/`zR`/`zM`, footer status) and
`docs/ai.md` (module map: `ui/timeline.lua`, `ui/highlights.lua`; new `ui`
options; the highlight group table; moved command list).
