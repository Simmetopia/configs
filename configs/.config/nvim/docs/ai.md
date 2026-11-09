# AI plugin: architecture and manual changes

This is one **Neovim plugin** with saved-comment and web-chat workflows plus
asynchronous selection help, and a small **Pi companion extension**. Lua must
run in Neovim (buffers, windows, saves); TypeScript must
run in Pi (the webfetch tool). They communicate through Pi's JSONL RPC protocol.
Consolidating the entry points does not mean combining session contexts or tools.

## Start here

- `plugin/ai.lua`: your local settings; the single Neovim entry point.
- `lua/ai/config.lua`: all default options, with no credentials.
- `lua/ai/init.lua`: commands, mappings, autocmds, and shutdown registration.
- [Usage and safeguards](../lua/ai/AI_COMMENTS.md): comment markers and commands.

The implementation uses Neovim 0.12+ APIs (`vim.uv`, `vim.fs`, Tree-sitter) and
Pi's current RPC protocol including `agent_settled`. The config's native package
loader uses `vim.pack`. Keep `pi` on Neovim's PATH and configure provider
credentials through Pi, never through this plugin.

## Module map

```text
plugin/ai.lua                setup and local overrides
lua/ai/
  init.lua                  public setup; all global registrations
  config.lua                profile model roles, mappings, limits, UI dimensions
  profiles.lua              profile preparation, transitions, and generation ownership
  prompts.lua               model-facing chat and comment instructions
  project.lua               canonical paths and buffer project lookup
  protocol.lua              JSONL framing, text blocks, stream reconstruction
  rpc.lua                   process/pipes, response IDs, deadlines, shutdown
  session.lua               stable IDs, tool policies, model/thinking handshake
  session_ids.lua           current identities for explicit new conversations
  chat.lua                  web-chat queue and events
  comments/
    init.lua                saved-comment queue and request lifecycle
    markers.lua             marker grammar, fallback comment leaders, FIFO helpers
    scanner.lua             Tree-sitter first; fallback only if unavailable
    treesitter.lua          actual comment-node traversal
    files.lua               disk/buffer comparison and exact-marker cleanup
    storage.lua             handled-marker fingerprints
  ui/
    view.lua                shared float, input buffer, typed entries, borders, input
    timeline.lua            pure renderer: message bands, tool badges, event groups
    highlights.lua          AI* highlight groups and icon defaults
    markdown.lua            conversation buffer/window setup and Markdown injections
lua/ai/pi-extension/
  index.ts                  the single local Pi extension entry point
  package.json              explicit Pi package manifest
  web.ts                    URL checks, HTML conversion, bounded/deadlined fetch
  tools/webfetch.ts         thin tool registration and source/result formatting
```

Follow imports to find dependencies. Transport doesn't know about markers or
windows. The UI doesn't launch Pi or change project files. Workflows coordinate
their own queues through shared session and view APIs. Modules register no
autocmds at import time; `setup()` is idempotent and owns global registrations.
To change options after setup, restart Neovim; calling setup again is a no-op,
not a hot reload of active processes.

## Typical manual changes

### Models, keys and display limits

Edit `plugin/ai.lua`:

```lua
require('ai').setup({
  active_profile = 'default',
  profiles = {
    default = {
      agent_dir = vim.fn.stdpath('data') .. '/pi-nvim/default',
      models_file = vim.fn.expand('~/.pi/agent/models.json'),
      models = {
        chat = { provider = 'your-provider', id = 'your-chat-model', thinking = 'high' },
        cheap = { provider = 'your-provider', id = 'your-fast-model', thinking = 'high' },
        expensive = { provider = 'your-provider', id = 'your-reasoning-model', thinking = 'medium' },
      },
    },
  },
  mappings = { project = '<leader>aip', chat = '<leader>aic', help = '<leader>aih' },
  help = { role = 'cheap', bang_role = 'expensive' },
  comments = { enabled = true, prompt_role = 'cheap' },
  chat = { role = 'chat', search_extension = '/absolute/path/to/pi-web-search/src/index.ts' },
  ui = {
    width = 0.8, height = 0.75, conceallevel = 0,
    restore_history = false, -- true: show earlier messages on reconnect
    icons = { user = '', assistant = '󰚩', warn = '', error = '', running = '⋯', ok = '✓', failed = '✗',
      fold_closed = '▸', fold_open = '▾', band = '▓▓' }, -- partial overrides are merged; use ASCII without a Nerd Font
  },
  limits = { history_lines = 350, response_bytes = 20000 },
})
```

The `chat`, `cheap`, and `expensive` role descriptors each require a Pi provider
and model ID; `thinking` is optional and defaults to `off`. `models_file` is an
optional readable local model catalogue. The profile's `agent_dir` remains
separate from both the terminal Pi agent directory and other profile agent
directories. Profile setup may create `models.json` there as a symlink to the
explicit `models_file`; it never copies or shares `auth.json`. Provision provider
authentication per profile using Pi's normal authentication setup, or use
provider environment variables. Do not put credentials in model descriptors.

`:AIProfile` opens the profile picker, `:AIProfile <name>` selects a profile
when all workflows are idle, and `:AIProfileStatus` shows active roles and
transition state. Each profile has separate Pi histories and generation-scoped
workflow callbacks. `:AIHelpModel` overrides remain memory-only and profile
scoped. Set `comments.enabled = false` to stop automatic saved-marker dispatch;
commands and manual prompts remain. Single markers use `cheap`, doubled markers
use `expensive`; help defaults to `cheap` and bang help to `expensive`; web chat
uses `chat` with its separate web-only tool loadout.
The model names in this dotfiles configuration reflect its LEGO gateway; other
users must supply models available from their providers.

A resumed model mismatch is deliberately refused. Stop the relevant session,
then choose a new session identity or manage the existing profile session in Pi
if you change a role's model; don't silently replay a different model's context.

### Instructions and tool permissions

Edit `prompts.lua` to change wording. Edit `session.lua` to change CLI loadouts:

| Workflow | Active tools | Explicit extensions |
|---|---|---|
| Edit/manual | `read,bash,edit,write` | none |
| Question | `read,grep,find,ls` | none |
| Selection help | `read,grep,find,ls,replace_selection` | companion |
| Web chat | `web_search,webfetch` | configured local search entry and companion |

Every workflow passes CLI flags to suppress automatic Pi extensions, MCP,
skills, prompt templates, context files, and appended system-prompt discovery,
and passes `--no-themes`. On Pi 1.5.0 the TUI still lists the agent theme;
RPC theme discovery is unobservable because `getAllThemes()` is an empty stub,
so the flag is not evidence of complete theme-registry suppression. Each
workflow receives its plugin-owned mode prompt. This is a practical CLI policy,
not a sandbox: read tools can access files available to Pi, project
trust/permission behavior still applies, and the edit workflow is intentionally
project-mutation capable.

The search extension is the pinned external `pi-web-search@1.6.0` package, not
vendored. Chat requires a local installed entry point configured with
`chat.search_extension`; missing/moved packages fail closed without installing
or downloading. In the installed Pi 1.5.0 probe, a selected search package with
a missing dependency exits at startup with a local dependency diagnostic,
before the capability handshake; this is not a returned readiness status.
`PI_WEB_SEARCH_CONFIG` is inherited when set, otherwise the
extension may read `web-search.json` from the profile agent directory. A separate
search-model override may use different credentials and incur separate costs;
loading the extension does not verify live gateway/search compatibility.

### Comment syntax and cleanup

Edit `comments/markers.lua` for supported comment leaders or marker grammar.
Edit `prompts.comment()` for nearby context selection. The scanner prefers
actual single-line comment nodes; its fallback is only a heuristic.

Keep cleanup in `comments/files.lua`. It checks that the buffer is loaded,
unmodified, Unix-format, within the file-size limit, and byte-for-byte equal to
the disk. It removes only the exact original marker, not nearby code. Altering
these checks can overwrite unsaved edits or dispatch the wrong request.

### Markdown and code snippets

Edit `ui/timeline.lua` for presentation and `ui/view.lua` for layout/input.
The buffer stays `ft=markdown` everywhere. Fenced languages are Tree-sitter
injections: install `markdown`, `markdown_inline`, and each code language's
parser. In this configuration the existing tree-sitter-manager ensures the
Markdown and Python parsers; install others with `:TSInstall <language>`.
Missing parsers do not prevent the float opening, but that language won't have
Tree-sitter highlighting. Fence tags are visible by default for readability.

### Conversation view

Both conversation floats show messages as coloured bands (`You · Prompt`,
`You · AI! path:line` for saved markers, and the short model name for
assistant replies). Tool calls appear as badges that change from `⋯` to `✓` or
`✗`. Info and status lines collapse into a "▸ N events" group; warnings and
errors are coloured and never folded. The title is in the top border; status
and a key hint are in the bottom border (a winbar when `ui.border = 'none'`).

Keys in both buffers: `i` opens the input, `q` hides, `<C-l>` clears the
display. `za`/`<Tab>` toggle the message or event group under the cursor,
`zc`/`zo` close/open it, `zM`/`zR` fold/unfold all, and `H` shows earlier
messages held back on reconnect (see `ui.restore_history`). Folding is
implemented by the renderer, not Neovim folds (`foldenable` is off).

Commands (no longer listed in the window):

- Project: `:AIToggle`, `:AINew`, `:AIStatus`, `:AIAbort`, `:AIStop`,
  `:AIRestart`, `:AIClear`
- Web chat: `:AIChat`, `:AIChatNew`, `:AIChatStop`, `:AIChatRestart`,
  `:AIChatClear`

Highlight groups link to standard groups with `default = true`, so override them
with `vim.api.nvim_set_hl`:

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

## Request lifecycle

1. `BufWritePost` calls `comments.saved()`.
2. Resolve a canonical project root; compare disk and buffer; scan markers.
3. Build a bounded prompt and fingerprint; deduplicate and enqueue FIFO.
4. Start the appropriate `mode:role` session on demand.
5. RPC correlates response IDs. Session startup validates model/thinking and
   restores recent history **before** sending new prompts.
6. Stream text blocks by `contentIndex`; finalized `message_end` is authoritative.
7. Prompt acceptance and `agent_settled` must both arrive before finishing.
   `agent_end` alone is not completion: retries/compaction may still follow.
8. On success, remember the fingerprint and attempt exact-marker cleanup.
   Failure/abort retains the marker and clears deduplication for retry.
9. Schedule the next queued request. Hiding a window doesn't stop the session.

Chat has its own FIFO and settled/acceptance gate, without marker cleanup.
Both workflows share response framing, process ownership, startup validation,
Markdown presentation and graceful shutdown with a signal fallback.

## Persistence and compatibility

Handled-marker fingerprints remain in the root-global
`stdpath('state')/ai-comments/` store. Session identities include the active
profile, role, model, and canonical agent/project directories; pointer files are
saved atomically under `stdpath('state')/ai-profile-sessions/`. Earlier session
pointers and transcripts are never imported or deleted. Each profile's current
history resumes independently; `:AIChatNew` or `:AINew` explicitly selects a
fresh identity for just that conversation. New commands wait for the idle process to exit
before reconnecting with the new identity, preserving model and tool policies.
They refuse active/queued/connecting work, clear the display and draft, and do
not carry over conversation context. `:AINew` resets only the configured
`comments.prompt_role` edit session (cheap by default, shared with `AI!`), not
other edit/question histories, handled-marker fingerprints, project files, or
context instructions.
Old Lua module names (`ai_comments`, `ai_chat`) are removed; consumers should
use `require('ai').setup()`. Profile selection is available through
`:AIProfile` and `:AIProfileStatus`. Existing project/chat mappings remain
unchanged, with a profile-configurable selection-help mapping.

Pi stores the full transcript. The Neovim view is bounded; restored responses
and streamed display are clipped from the start to preserve opening Markdown
structure. A display truncation notice points to the full Pi session. The log's
line limit can still cut older Markdown blocks; it is not a transcript archive.
`Ctrl-L`, `:AIClear`, and `:AIChatClear` clear only the corresponding view's log.
They leave session context, queues, drafts and active streams untouched; a
reconnection can restore persisted messages again.

## Sharing outside this dotfiles repo

Copy `lua/ai/` (including `pi-extension/`), the docs, and tests into a plugin repository. Put it on
Neovim's runtimepath and call `require('ai').setup(...)` from your configuration.
For manual setup, omit the dotfiles-specific `plugin/ai.lua`, or keep exactly one
entry point; an automatic setup runs before a later explicit setup can change it.
The companion lives in `lua/ai/pi-extension/` alongside the Lua modules.
Neovim does not execute its TypeScript files; Pi loads `index.ts` explicitly
for selection help and web chat. The path is resolved relative to
`lua/ai/config.lua`, not to `~/.config/nvim`, so package installs work too.

The Pi manifest exposes only `index.ts`, preventing helper files from being
loaded as independent extensions. Its host-provided packages are peer dependencies.
It is marked private to prevent accidental publication; review name, license,
version and dependency policy before publishing. The companion is not autoloaded
into edit/question sessions; selection help and chat request it explicitly.

## Tests

```sh
bash tests/run_ai.sh
```

The web tests require Node.js 22.18+ (native TypeScript stripping) and use mocked
fetch responses, not network requests. Shared UI tests cover draft retention,
multiline submission and resize behavior, including small editors. New-topic
tests cover busy refusal, empty context, retained old transcripts, model routing,
and reconnecting to the new identity. The runner isolates Neovim state and mock
transcripts in disposable directories.

Offline tests cover markers, fallback/Tree-sitter scanning, cleanup, queues,
model-role isolation, process exit/restart, Markdown language injections,
response framing, multi-block streaming, restored string messages, model
mismatch, startup timeout, and idempotent unified setup. The mock executable is
`tests/bin/pi`. They require the Lua parser for scanner coverage; Markdown
rendering tests require Markdown parsers. Python-specific coverage runs when
its parser is available.

`tests/ai_comments_live.lua` is an **opt-in**, billable real-provider check in a
disposable project; see the usage guide for its explicit model catalogue and
isolated profile-agent setup. It is not run by the offline suite.
Loading the companion can be checked without a model prompt:

```sh
pi --offline --no-extensions --extension ./lua/ai/pi-extension/index.ts --help
```

## Safety boundaries and limitations

- Pi and extensions run with your OS user's permissions; tool allowlists and
  project roots are not a sandbox. Review diffs and use OS/container isolation
  where necessary. No automatic project approval or commits are added.
- Diagnostics are signalled without copying potentially sensitive stderr text.
- Unsupported Pi extension dialogs are cancelled, not auto-approved.
- Webfetch rejects obvious local/IP URLs and redirects, bounds input/output,
  and handles HTML/plain text. A 20-second deadline covers headers and body;
  caller cancellation is preserved, and rejected response bodies are released. DNS can still resolve a public name to a private
  address; this is **not SSRF protection** or network isolation. HTML conversion
  is intentionally lightweight, not a browser or comprehensive sanitizer.
- Startup has a deadline; active model runs intentionally have no fixed timeout.
- Do not share persisted Pi sessions without reviewing their sensitive content.
