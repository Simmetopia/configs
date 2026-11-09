# Scannable AI Conversation UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat string log in `<leader>aip`/`<leader>aic` with typed
timeline entries. They render as coloured message bands, tool badges that
update in place, and collapsible event groups, with the status shown in the
float border.

**Architecture:** A pure `ui/timeline.lua` turns entries into
`{ lines, marks, groups }`. `ui/view.lua` stores entries and applies the
output with extmarks. Workflows (`chat.lua`, `comments/init.lua`, and
`help.lua` via `comments.log`) add typed entries instead of strings.

**Tech Stack:** Neovim 0.13 Lua, extmarks, Tree-sitter markdown, offline
tests via `bash tests/run_ai.sh <group>`.

**Spec:** `docs/superpowers/specs/2026-11-09-ai-conversation-ui-design.md`

## Global Constraints

- No new plugin dependencies.
- Highlight groups are defined with `default = true` links, exactly as in the
  spec's table.
- Icons live in `config.defaults.ui.icons`, with exactly the spec's default
  glyphs. Partial overrides work through the existing `tbl_deep_extend`.
- Warn and error events are never inside a collapsed group.
- Workflow behaviour (queue, sessions, ownership/token checks, persistence,
  `i`/`q`/`<C-l>` keymaps, input float) is unchanged. Only the bodies of
  `append(...)` call sites change.
- Status strings keep their current wording (tests match `queued: 0`, `Busy`,
  `Stopped`, `Connecting`, `busy (`). They move from the buffer to the footer.
- Help strings become `i prompt · za fold · ^L clear · q hide`.
- Every task ends with its test groups passing. Integration groups (`ai_chat`,
  `ai_comments`, `ai_new`, `ai_profiles`, `ai_profiles_busy`) **already time
  out on this machine before any change**: headless-Neovim child processes take
  about 3.5 s to launch. Run those groups from the user's own terminal
  (`! bash tests/run_ai.sh ai_chat`). Do not loosen test timeouts to compensate.

**Deliberate refinements of the spec** (same behaviour, simpler interface):

- The tool entry's Pi id field is `call_id`, because `uid` is the generic
  entry identity.
- `view.add` is idempotent per `uid`. That lets `tools.finish` mutate the
  stored entry and return it, and `view.add` re-adds it only if it is missing
  (for example after `<C-l>`). This replaces separate
  `view.tool_start`/`view.tool_finish`; workflows call
  `view.add(v, tools.start(session, event))` and
  `view.add(v, tools.finish(session, event))`.

## Review Focus

1. **Streaming re-render with groups open.** When chunks stream while a group
   is expanded, the group must stay expanded and the cursor must keep
   following. The test goes in Task 3: `open_state_survives_render`.
2. **Answer truncated mid-fence by `protocol.clip`.** Badges and events after
   it must not be styled or parsed as code. Test in Task 1: `fence_autoclose`.
3. **`<C-l>` while a tool is running.** The finish must show one `✓` badge,
   not a crash and not two lines. Test in Task 3: `finish_after_clear`.
4. **Narrow window (20 columns) with a long marker label.** The header must be
   truncated with `…` and the time must not overlap. Test in Task 1:
   `header_truncation`.
5. **Colorscheme change after opening.** Bands must keep their colours when
   `:colorscheme` clears highlights. Test in Task 1: `highlights_reapplied`.

---

### Task 1: Timeline renderer, highlights, icons

**Files:**
- Create: `lua/ai/ui/timeline.lua`, `lua/ai/ui/highlights.lua`, `tests/ai_timeline.lua`
- Modify: `lua/ai/config.lua:27` (ui defaults), `lua/ai/init.lua:90` (ColorScheme autocmd), `tests/run_ai.sh` (add `ai_timeline` to the case list and default run, after `ai_view`)

**Interfaces:**
- Produces:
  - `timeline.message(opts) -> entry`
    - `opts = { role = 'user'|'assistant', text, label?, model?, restored?, time? }`
    - `model` is stored after `timeline.short_model(opts.model)`
    - `time` defaults to `os.time()` unless `restored`
  - `timeline.tool(opts) -> entry`
    - `opts = { call_id, name, detail?, state = 'running'|'done'|'failed', started, elapsed? }`
  - `timeline.event(level, text) -> entry`
    - `level = 'info'|'warn'|'error'`
  - Every entry gets `kind` (`'message'|'tool'|'event'`) and a unique
    increasing integer `uid` from a module counter.
  - `timeline.short_model(id) -> string|nil`
    - strips `^%w+%.anthropic%.` and `%-%d%d%d%d%-%d%d%-%d%d$`
  - `timeline.height(entry) -> integer`
    - lines the entry contributes when expanded (used for trimming)
  - `timeline.render(entries, opts) -> { lines = string[], marks = { {row, col, extmark_opts} }, groups = { {row, key} } }`
    - `opts = { width = integer, open = { [uid] = true }, stream? = string, stream_model? = string }`
    - rows and cols are 0-based; `key` is the first entry's `uid`;
      `groups[i].row` is the group's header row
  - `highlights.setup()`: defines all spec groups with `default = true`
  - `highlights.icons() -> table`: returns `require('ai.config').options.ui.icons`

- [ ] **Step 1: Write `tests/ai_timeline.lua` (pure: `-u NONE`, no windows), with these assertions**

```lua
vim.opt.rtp:append(vim.fn.getcwd())
require('ai').setup(dofile('tests/fixtures/ai_setup.lua').options({ comments = { enabled = false } }))
local t = require('ai.ui.timeline')
local function has_mark(out, row, key, value)
  for _, m in ipairs(out.marks) do if m[1] == row and m[3][key] == value then return true end end
end
-- short_model
assert(t.short_model('eu.anthropic.claude-opus-5-5') == 'claude-opus-5-5')
assert(t.short_model('gpt-6-luna-2026-09-22') == 'gpt-6-luna')
-- bands
local user = t.message({ role = 'user', text = 'Refactor', label = 'AI! lua/a.lua:42' })
local pi = t.message({ role = 'assistant', text = 'Done', model = 'eu.anthropic.claude-opus-5-5' })
local old = t.message({ role = 'assistant', text = 'Earlier', restored = true })
local out = t.render({ user, pi, old }, { width = 80, open = {} })
assert(out.lines[1] == '## You · AI! lua/a.lua:42' and out.lines[2] == 'Refactor' and out.lines[3] == '')
assert(out.lines[4] == '## Pi · claude-opus-5-5' and out.lines[7] == '## Pi · restored')
assert(has_mark(out, 0, 'line_hl_group', 'AIBandUser') and has_mark(out, 3, 'line_hl_group', 'AIBandAssistant'))
assert(has_mark(out, 6, 'line_hl_group', 'AIBandRestored'))
assert(has_mark(out, 0, 'virt_text_pos', 'overlay') and has_mark(out, 0, 'virt_text_pos', 'right_align'))
assert(not has_mark(out, 6, 'virt_text_pos', 'right_align'), 'restored entry without time shows no time')
-- streaming header
out = t.render({}, { width = 80, open = {}, stream = 'partial', stream_model = 'gpt-6-luna-2026-09-22' })
assert(out.lines[1] == '## Pi · gpt-6-luna · responding ⋯' and out.lines[2] == 'partial')
-- fence_autoclose
out = t.render({ t.message({ role = 'assistant', text = '```lua\nlocal x' }), t.event('info', 'Settled: x') }, { width = 80, open = {} })
assert(out.lines[4] == '```', 'unbalanced fence closed before the next entry')
-- tool badges: classes, states, in-place mutation keeps one line
local tool = t.tool({ call_id = 'a', name = 'edit', detail = 'lua/a.lua', state = 'running', started = 0 })
out = t.render({ tool }, { width = 80, open = {} })
assert(#out.lines == 1 and out.lines[1] == '  [edit] lua/a.lua')
assert(has_mark(out, 0, 'hl_group', 'AIToolWrite'))
tool.state, tool.elapsed = 'done', 0.4
out = t.render({ tool }, { width = 80, open = {} })
assert(#out.lines == 1)
local ok_chunk = false
for _, m in ipairs(out.marks) do
  if m[3].virt_text and m[3].virt_text[1][1]:find('✓ 0.4s', 1, true) and m[3].virt_text[1][2] == 'AIToolOk' then ok_chunk = true end
end
assert(ok_chunk)
assert(has_mark(t.render({ t.tool({ call_id = 'b', name = 'bash', state = 'failed', started = 0, elapsed = 1.2 }) }, { width = 80, open = {} }), 0, 'hl_group', 'AIToolExec'))
-- event groups
local e1, e2, e3 = t.event('info', 'Connected'), t.event('info', 'queued'), t.event('info', 'Settled: x')
local warn, e4 = t.event('warn', 'Assistant stopped: length'), t.event('info', 'Stopping')
out = t.render({ e1, e2, e3, warn, e4 }, { width = 80, open = {} })
assert(out.lines[1] == '▸ 3 events · Settled: x' and #out.groups == 1 and out.groups[1].key == e1.uid and out.groups[1].row == 0)
assert(out.lines[2]:find('Assistant stopped: length', 1, true) and has_mark(out, 1, 'hl_group', 'AIEventWarn'))
assert(out.lines[3] == '· Stopping', 'single-event group renders inline')
out = t.render({ e1, e2, e3 }, { width = 80, open = { [e1.uid] = true } })
assert(out.lines[1] == '▾ 3 events' and out.lines[2] == '· Connected' and out.lines[4] == '· Settled: x')
-- blank line between a tool/event run and a following message
out = t.render({ e4, t.message({ role = 'user', text = 'hi' }) }, { width = 80, open = {} })
assert(out.lines[2] == '' and out.lines[3]:match('^## You'))
-- header_truncation
local long = t.message({ role = 'user', text = 'x', label = string.rep('long/path/', 10) .. 'file.lua:1' })
out = t.render({ long }, { width = 20, open = {} })
assert(vim.fn.strdisplaywidth(out.lines[1]) <= 20 - 6 and out.lines[1]:find('…', 1, true))
-- height
assert(t.height(user) == 3 and t.height(e1) == 1)
-- highlights_reapplied
vim.cmd('highlight clear')
vim.api.nvim_exec_autocmds('ColorScheme', {})
assert(next(vim.api.nvim_get_hl(0, { name = 'AIBandUser' })) ~= nil)
print('AI timeline tests passed')
```

- [ ] **Step 2: Run, expect failure**

Run: `bash tests/run_ai.sh ai_timeline`
Expected: FAIL, `module 'ai.ui.timeline' not found`.

- [ ] **Step 3: Implement `lua/ai/ui/highlights.lua` and the config/init wiring**

- Add `icons` to `config.defaults.ui` exactly as the spec's Configuration block.
- `highlights.setup()` runs once at module load. `init.lua` adds
  `vim.api.nvim_create_autocmd('ColorScheme', { group = group, callback = require('ai.ui.highlights').setup })`
  next to the existing `help.highlights` autocmd.

- [ ] **Step 4: Implement `lua/ai/ui/timeline.lua` per the spec's Rendering rules**

Pinned details the test does not fully determine:

- **Header overlay:** `{ virt_text = { { icons.band .. ' ' .. icon .. ' ', group } }, virt_text_pos = 'overlay' }` at col 0.
- **Header text highlight:** `{ end_col = #line, hl_group = group, priority = 200 }`, where `group` is the band group.
- **Time:** `{ virt_text = { { os.date('%H:%M', time), { group, 'AIBandMeta' } } }, virt_text_pos = 'right_align' }`.
- **Header truncation:** budget is `width - 6` display cells (5-cell time plus a space).
- **Badges:** a name chunk `{ col = 2, end_col = 4 + #name, hl_group = class }`.
- **Badge state:** a `right_align` chunk, `icons.running` / `icons.ok` / `icons.failed`, followed by `(' %.1fs'):format(elapsed)` only when `elapsed` is a number,, with `AIToolRunning` / `AIToolOk` / `AIToolFailed`.
- **Events:**
  - info lines are `'· ' .. text`, highlighted `AIEvent`
  - warn/error lines are `icon .. ' ' .. text`, highlighted `AIEventWarn` / `AIEventError`
  - multi-line event text continues on extra lines, indented by two spaces
- **Group headers:** `AIFold` over the whole line. The collapsed form uses the *first line* of the last event's text.
- **Code background:** fenced code rows inside message bodies get `{ line_hl_group = 'AICode' }`, using the fence scan logic moved from `markdown.decorate`.

- [ ] **Step 5: Run, expect pass**

Run: `bash tests/run_ai.sh ai_timeline ai_config`
Expected: `AI timeline tests passed`, `AI config tests passed`.

- [ ] **Step 6: Commit**

```bash
git add lua/ai/ui/timeline.lua lua/ai/ui/highlights.lua lua/ai/config.lua lua/ai/init.lua tests/ai_timeline.lua tests/run_ai.sh
git commit -m "feat(ai): timeline renderer, highlight groups and icons"
```

### Task 2: Tool progress as entries

**Files:**
- Modify: `lua/ai/ui/tools.lua`, `tests/ai_tools.lua`

**Interfaces:**
- Consumes: `timeline.tool(opts)`
- Produces:
  - `tools.start(session, event) -> entry`
    - stores the entry in `session.tools[event.toolCallId or event.toolName or 'tool']`
  - `tools.finish(session, event) -> entry`
    - mutates and returns the stored entry, setting `state = 'done'|'failed'`
      and `elapsed` in seconds
    - removes it from `session.tools`
    - with no stored entry, returns a new finished entry with `elapsed = nil`
  - `summary` keeps its rules, but returns `name, detail` separately.

- [ ] **Step 1: Rewrite `tests/ai_tools.lua` assertions against entries**

Keep every existing case. Replace the string checks with field checks:

- `start(...).name == 'bash'` and `.detail == 'rg -n TODO lua'` and `.state == 'running'`
- the finished `a` is the **same table** as its start entry (`rawequal`), with
  `state == 'done'` and `type(elapsed) == 'number'`
- `b` gets `state == 'failed'`
- read detail is `'lua/init.lua (line 20)'`; grep detail is `'TODO in lua'`
- `tools.finish({}, { toolName = 'edit' })` gives `.state == 'done'` and `.elapsed == nil`
- `SECRET` is absent from `vim.inspect(edit_entry)`
- the long detail is shorter than 145 chars and contains `…`
- `next(session.tools) == nil` after both finishes

- [ ] **Step 2: Run, expect failure**

Run: `bash tests/run_ai.sh ai_tools`. Expected: FAIL on the field assertions.

- [ ] **Step 3: Implement in `lua/ai/ui/tools.lua`**

`started = vim.uv.hrtime()`; `elapsed = (vim.uv.hrtime() - started) / 1e9`.

- [ ] **Step 4: Run, expect pass**

Run: `bash tests/run_ai.sh ai_tools ai_timeline`. Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add lua/ai/ui/tools.lua tests/ai_tools.lua
git commit -m "feat(ai): tool progress as timeline entries"
```

### Task 3: View stores entries and renders bands, footer and groups

**Files:**
- Modify: `lua/ai/ui/view.lua`, `lua/ai/ui/markdown.lua` (remove `message`/`decorate`), `tests/ai_view.lua`, `tests/ai_markdown.lua`

**Interfaces:**
- Consumes: `timeline.render`, `timeline.height`, `timeline.message`, `timeline.event`, `highlights.icons`
- Produces:
  - `view.new(root, title, help, status, stream, submit, owner, stream_model?)`
    - `stream_model` is an optional function returning the streaming model id
  - `view.add(view, entry)`
    - idempotent by `entry.uid`
    - trims whole entries from the front while the summed
      `timeline.height` exceeds `limits.history_lines`
  - `view.message(view, role, text, opts?)`: `opts` is passed to
    `timeline.message` and merged with `role`/`text`
  - `view.event(view, level, text)`
  - `view.entries(view) -> entry[]`
  - `view.render(view)` and `view.clear(view)`
    - `clear` empties entries, the uid index and `view.open`
  - `view.reset`, `view.hide`, `view.input`, `view.toggle`, `view.resize`,
    `view.set_submit`: unchanged signatures
  - `view.append` and `view.log` are removed

- [ ] **Step 1: Update `tests/ai_view.lua`**

Keep the input/draft/resize assertions. Change and add the following:

- Constructor help string: `'i prompt · za fold · ^L clear · q hide'`.
- After `<C-L>`:
  - `#view.entries(v) == 0`
  - `nvim_buf_line_count(v.buf) == 1`
  - the single line is `''`
- Title and footer:
  - `nvim_win_get_config(v.win).title` chunks joined contain `'Pi test · /tmp/project'`
  - the footer contains `'Ready'` and `'za fold'`
- **open_state_survives_render**
  - add 3 info events and move the cursor to row 1
  - call the buffer-local `za` callback; the line is now `'▾ 3 events'`
  - with the cursor on the last line, set `v.stream` to return `'chunk'`,
    then `view.render(v)` twice
  - line 1 is still `'▾ 3 events'`, and the cursor is on the last line
  - `zM` gives `'▸ 3 events · …'`; `zR` re-expands
- **finish_after_clear**

  ```lua
  local s = {}
  view.add(v, require('ai.ui.tools').start(s, { toolCallId = 'x', toolName = 'read', args = { path = 'a' } }))
  view.clear(v)
  view.add(v, require('ai.ui.tools').finish(s, { toolCallId = 'x', toolName = 'read' }))
  view.render(v)
  ```

  then assert exactly one buffer line matches `'^  %[read%] a$'`, and
  `#view.entries(v) == 1`.
- `<Tab>` toggles like `za`. `za` on a non-group line does not error.
- Border `'none'`: set `require('ai.config').options.ui.border = 'none'`,
  then hide and toggle again. `vim.wo[v.win].winbar` contains `'Ready'`.
  Restore the border to `'single'`.
- Trimming: set `limits.history_lines = 10` and add 6 messages of height 3.
  Then `#view.entries(v) == 3`, and the first entry is the 4th added. Restore
  the limit to 350.

- [ ] **Step 2: Update `tests/ai_markdown.lua`**

- Drop the `markdown.message`/`decorate` calls.
- Build the lines with `require('ai.ui.timeline').render({ timeline.message({ role = 'assistant', text = '# Title\n\n- Item\n\n```lua\nlocal x = 1\n```' }) }, { width = 70, open = {} }).lines`.
- Assert `lines[1] == '## Pi'` and `lines[2] == '# Title'`.
- Keep the fence/body adjacency and the Lua/Python injection assertions.
- The fence-background check: apply the render marks yourself and assert the
  `local x = 1` row has a `line_hl_group == 'AICode'` mark.

- [ ] **Step 3: Run, expect failure**

Run: `bash tests/run_ai.sh ai_view ai_markdown`. Expected: FAIL (`view.entries` is nil).

- [ ] **Step 4: Implement**

**Rendering (`view.render`):**
1. `timeline.render(view.entries_list, { width = win width or 80, open = view.open, stream = view.stream(), stream_model = view.stream_model and view.stream_model() })`
2. `set_lines`
3. clear the namespace
4. `pcall(nvim_buf_set_extmark, buf, ns, row, col, opts)` per mark
5. store `view.groups`
6. update the border: `nvim_win_set_config(win, { title = …, footer = …, footer_pos = 'left' })`.
   Use the winbar instead when `ui.border == 'none'` (title/footer need a border).

**Group keys:**
- `za`/`<Tab>`: find the group whose `row` equals the cursor row minus 1, and
  toggle `view.open[key]`.
- `zR`: add every key in `view.groups` to `view.open`.
- `zM`: set `view.open = {}`.
- Re-render after each.

**Other:** follow mode logic is unchanged. The namespace stays
`ai_conversation_markdown`.

- [ ] **Step 5: Run, expect pass**

Run: `bash tests/run_ai.sh ai_view ai_markdown ai_timeline ai_tools ai_help`
Expected: all print `passed`. `ai_help` still passes, because Task 5 changes
`help.lua`'s calls; until then `comments.log` must keep working. See the
Task 3 bridge below.

- **Bridge:** in `lua/ai/comments/init.lua`, change only `local function append(p, text)` to
  `view.event(p.view, 'info', text)`, and `M.log`'s message branch to `view.message(p.view, role == 'You' and 'user' or 'assistant', text)`.
- In `lua/ai/chat.lua`, change `append` to `view.event(c.view, 'info', text)`.
- Change the two `tools.start/finish` call sites in each of the three files to
  `view.add(v, tools.…)`. In `help.lua`, this means the `log(job, tools…)`
  lines go through a temporary
  `pcall(require('ai.comments').log, job.root, entry, nil, job.profile_name)`
  branch, where `M.log` accepts a table `text` and calls `view.add`.

Tasks 4 and 5 replace the bridge with classified calls.

- [ ] **Step 6: Commit**

```bash
git add lua/ai/ui/view.lua lua/ai/ui/markdown.lua lua/ai/chat.lua lua/ai/comments/init.lua lua/ai/help.lua tests/ai_view.lua tests/ai_markdown.lua
git commit -m "feat(ai): render typed timeline with bands, badges, groups and border status"
```

### Task 4: Web chat emits classified entries

**Files:**
- Modify: `lua/ai/chat.lua`, `tests/ai_chat.lua`

**Interfaces:**
- Consumes: `view.message(v, role, text, opts)`, `view.event(v, level, text)`,
  `view.add`, `view.new(..., stream_model)`
- Produces: no new API.

- [ ] **Step 1: Update `tests/ai_chat.lua`**

- Add a helper `local function text()` that joins the buffer lines with every
  footer chunk of windows showing `conversation`
  (`vim.fn.win_findbuf(conversation)`, `nvim_win_get_config(w).footer`).
- Replace `'### Pi\n\ndone'` with `'## Pi · gpt-6.1-sol\ndone'`.
- The `'Stopped'` and dispatch-error messages use `text()`.

- [ ] **Step 2: Implement the mapping in `lua/ai/chat.lua`**

This follows the spec's call-site table (chat rows):

- **Assistant `message_end`:** `view.message(c.view, 'assistant', clipped, { model = session.model.id })`.
- **Restored history:** `view.message(c.view, message.role, clipped, { restored = true, model = c.session.model.id })`.
- **Dispatch:** `view.message(c.view, 'user', message)`.
- **`stream_model`:** `function() return c.session and c.session.model.id end`.
- **`event warn`:**
  - extension dialog cancelled
  - `on_diagnostic`
- **`event error`:**
  - `Model error…`
  - `Unmatched…`
  - `on_error`
  - `Pi exited…`
  - start `err`
  - `Prompt rejected`
  - `RPC write failed`
- **Help string:** `'i prompt · za fold · ^L clear · q hide'`.
- Delete the local `append` helper.

- [ ] **Step 3: Run the groups**

Run: `bash tests/run_ai.sh ai_profile_callbacks ai_view`. Expected: pass.

Then ask the user to run `! bash tests/run_ai.sh ai_chat ai_profiles_busy`
(these time out in the agent environment). Expected: `AI chat tests passed`.

- [ ] **Step 4: Commit**

```bash
git add lua/ai/chat.lua tests/ai_chat.lua
git commit -m "feat(ai): web chat emits typed timeline entries"
```

### Task 4b: Persistent message folding and opt-in restored history

Added after monkey test 2. See the spec's Keymaps **Amendment**.

**Files:**
- Modify: `lua/ai/ui/timeline.lua`, `lua/ai/ui/view.lua`, `lua/ai/ui/markdown.lua` (`setup`: `vim.wo[win].foldenable = false`), `lua/ai/config.lua` (`ui.restore_history = false`), `lua/ai/chat.lua` (`on_ready`), `tests/ai_timeline.lua`, `tests/ai_view.lua`

**Interfaces:**
- Consumes: Task 1/3 `timeline.render`, `view` API.
- Produces:
  - `timeline.render(entries, opts)`
    - `opts` gains `folded = { [uid] = true }`
    - the result gains `messages = { { first = row0, last = row0, key = uid } }`
      (non-streaming messages only)
    - each `groups[i]` gains `last = row0`
  - `view.folded` holds the per-view folded message set; `view.clear`
    resets it together with `view.open`
  - `view.hold_history(view, entries)`
    - stores restored entries for later
    - adds the info event `('Resumed session — %d earlier messages hidden (H to show)'):format(#entries)`
      when `#entries > 0`
  - `view.show_history(view)`
    - inserts the held entries before all current entries (index updated),
      clears the held set, trims, renders
    - does nothing when nothing is held
  - Buffer keys:
    - `za`/`<Tab>` toggle, `zc` close, `zo` open the unit containing the cursor
    - `zM`/`zR` affect all units
    - `H` calls `show_history`

- [ ] **Step 1: Tests in `tests/ai_timeline.lua`**
  - `t.render({ pi }, { width = 80, open = {}, folded = { [pi.uid] = true } })`
    - the result has exactly 2 lines: `'## Pi · claude-opus-5-5'` then `''`
    - one right_align chunk contains `'▸ 1 lines'`
  - Unfolded: `out.messages[1]` equals `{ first = 0, last = 1, key = pi.uid }`
    (header plus 1 body row; the trailing blank row is excluded).
  - The streaming message never appears in `messages`.
  - An expanded 3-event group has `groups[1].last == 3`.

- [ ] **Step 2: Tests in `tests/ai_view.lua`**
  - **`fold_persists`**
    - add a user message and a 3-line assistant message
    - put the cursor on the assistant's 2nd body line and press `za`
    - the buffer shows the assistant band without its body, and the cursor
      is on the band row
    - `view.event(v, 'info', 'x')`, then render with a streaming chunk
    - the assistant is still folded
    - `zR` unfolds it; `zM` folds both messages
  - **Native folds:** `vim.wo[v.win].foldenable == false`.
  - **History is held:** `hold_history` with 2 restored messages gives an
    info entry whose text contains `'2 earlier messages hidden'`.
  - **History is shown:**
    - with `H`, the first two entries are the restored ones (in order),
      followed by the earlier entries
    - a second `H` adds nothing
  - **No history:** `hold_history(v, {})` adds no entry.

- [ ] **Step 3: Run, expect failure**

Run: `bash tests/run_ai.sh ai_timeline ai_view`. Expected: FAIL.

- [ ] **Step 4: Implement**

- **Folded rendering:** a folded message renders only its header row plus
  the separator blank.
- **Header chunk:** the right-aligned chunk is `{ icons.fold_closed .. (' %d lines  '):format(n), 'AIBandMeta' }`,
  followed by the existing time chunk, in one `virt_text` list.
- **`chat.lua` `on_ready`:** build the restored entries with
  `timeline.message({ role, text, restored = true, model })`. Then:
  - if `require('ai.config').options.ui.restore_history`, `view.add` each
  - otherwise `view.hold_history(c.view, entries)`
- **`config.lua`:** add `restore_history = false` to `config.defaults.ui`.

- [ ] **Step 5: Run, expect pass**

Run: `bash tests/run_ai.sh ai_timeline ai_view ai_markdown ai_config ai_help ai_profile_callbacks`. Expected: all pass. Confirm that `tests/ai_chat.lua` parses.

- [ ] **Step 6: Commit**

```bash
git add lua/ai/ui/timeline.lua lua/ai/ui/view.lua lua/ai/ui/markdown.lua lua/ai/config.lua lua/ai/chat.lua tests/ai_timeline.lua tests/ai_view.lua
git commit -m "feat(ai): persistent message folding and opt-in restored history"
```

### Task 5: Project conversation and selection jobs emit classified entries

> Amended by Task 4b: the project `on_ready` restored history uses the same
> `ui.restore_history` / `view.hold_history` pattern as chat, and
> `tests/ai_new.lua:67` must then check for the
> `'earlier messages hidden'` event instead of `'Pi · restored'`.

**Files:**
- Modify: `lua/ai/comments/init.lua`, `lua/ai/help.lua`, `tests/ai_comments.lua`, `tests/ai_new.lua`, `tests/ai_help.lua` (only if it inspects project-view text)

**Interfaces:**
- Consumes: Task 3/4 view API; `session.model.id`.
- Produces:
  - `comments.log(root, entry, profile_name)`
    - `entry` is a timeline entry
    - added via `view.add`, then rendered
    - same profile guard as today
  - The old `(root, text, role, profile_name)` form and the Task 3 bridge
    are removed.

- [ ] **Step 1: Update tests**

- **`tests/ai_comments.lua:259`:** the call becomes
  `require('ai.comments').log(project_root, require('ai.ui.timeline').event('info', 'cache studio before marker handling'), 'studio')`.
- **`tests/ai_comments.lua:340` and `:351`:** check entries instead of strings.

  ```lua
  local function has_event(v, text)
    for _, e in ipairs(require('ai.ui.view').entries(v)) do if e.kind == 'event' and e.text == text then return true end end
  end
  ```

  Assert `not has_event(abort_project.view, 'Abort failed; use :AIStop')` in both places.
- **`tests/ai_new.lua:13`:** `text(buf)` also joins the footer chunks of
  windows showing `buf` (same helper as Task 4).
- **`tests/ai_new.lua:67`:** `'Previous Pi'` becomes `'Pi · restored'`.
- **New assertion in `ai_comments.lua`,** right after the first marker
  dispatch: the project view has a user message entry whose
  `label == 'AI! ' .. <relpath> .. ':' .. <line>` and whose `text` is the
  marker instruction. Use the test's existing marker file and line.

- [ ] **Step 2: Implement the mapping in `lua/ai/comments/init.lua`**

This follows the spec's call-site table (project rows):

- **On dispatch, replace the `[sent]` line** with `view.message(p.view, 'user', item.text, { label = item.user_label })`.
  - Marker items set `item.text = marker.instruction` and `item.user_label = 'AI' .. marker.kind .. ' ' .. relpath .. ':' .. marker.number`.
  - Manual prompts set `item.text = text` and `item.user_label = 'Prompt'`.
- **`event info`:**
  - `[queued]`
  - `Connected…`
  - `Settled…`
  - `Stopping Pi RPC sessions`
  - `Pi: <type>`
- **`event warn`:**
  - `Assistant stopped…`
  - dialog cancelled
  - `Local queue cleared; abort requested`
  - `on_diagnostic`
- **`event error`:**
  - `Failed/aborted…`
  - `Unmatched…`
  - `Pi extension error…`
  - `Prompt rejected…`
  - `Abort failed…`
  - `on_error`
  - `… exited …`
  - start `err`
- **Assistant `message_end`:** `{ model = session.model.id }`.
- **Restored history:** `{ restored = true, model = session.model.id }`.
- **`stream_model`:** `function() return p.active and p.active.session.model.id end`.
- **Help string:** `'i prompt · za fold · ^L clear · q hide'`.

- [ ] **Step 3: Implement the mapping in `lua/ai/help.lua`**

`local function log(job, entry)` calls `comments.log(job.root, entry, job.profile_name)`.

| Line | Entry |
|------|-------|
| 137 Conflict | `event('warn', …)` |
| 152 Buffer closed | `event('error', …)` (multi-line kept) |
| 184 No change, 190 Applied, 442 Applied from review | `event('info', …)` |
| 203, 208 answers | `message({ role = 'assistant', text = …, model = job.session and job.session.model.id })` |
| 213, 261 Failed | `event('error', …)` |
| 232, 235 tools | `tools.start/finish(session, event)` entries |
| 392 Selection job | `message({ role = 'user', label = 'Selection [' .. role .. ']', text = instruction:sub(1, 200) })` |
| 282 diagnostic | `event('warn', text)` |

- [ ] **Step 4: Run the groups**

Run: `bash tests/run_ai.sh ai_help ai_view ai_profile_callbacks ai_comments_storage`. Expected: pass.

Then ask the user to run `! bash tests/run_ai.sh ai_comments ai_new ai_profiles`.
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add lua/ai/comments/init.lua lua/ai/help.lua tests/ai_comments.lua tests/ai_new.lua tests/ai_help.lua
git commit -m "feat(ai): project conversation and selection jobs emit typed entries"
```

### Task 6: Documentation and manual check

**Files:**
- Modify: `AI_COMMENTS.md`, `docs/ai.md`

- [ ] **Step 1: Update docs per the spec's Documentation section**

- In `AI_COMMENTS.md`, the `<leader>aip` bullet gains `za`/`<Tab>` (toggle
  event group) and `zR`/`zM`, and notes that status is in the bottom border.
- In `docs/ai.md`:
  - the module map adds `ui/timeline.lua` and `ui/highlights.lua`
  - the `ui` options example adds `icons`
  - add the highlight group table from the spec
  - the command list that used to be in the window help line goes under the
    conversation section
- Fix `docs/ai.md:158` to read "Edit `ui/timeline.lua` for presentation and
  `ui/view.lua` for layout/input."

- [ ] **Step 2: Full offline run**

Run: `bash tests/run_ai.sh`. Expected in the agent environment: every pure
group passes, and integration groups may time out (known baseline). Ask the
user to run `! bash tests/run_ai.sh` in their terminal and report the result.

- [ ] **Step 3: Manual check (user, in Kanagawa and `:colorscheme default`)**

1. Open `<leader>aip`, send a prompt that runs a tool and fails one.
2. Check the band colours, the badge `⋯` → `✓`, the groups toggling with `za`,
   the error staying visible, and the footer status updating.
3. Repeat in `<leader>aic`.

- [ ] **Step 4: Commit**

```bash
git add AI_COMMENTS.md docs/ai.md
git commit -m "docs(ai): document scannable conversation UI"
```
