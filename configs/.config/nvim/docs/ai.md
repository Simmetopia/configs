# AI plugin: architecture and manual changes

This is one **Neovim plugin** with two workflows and a small **Pi companion
extension**. Lua must run in Neovim (buffers, windows, saves); TypeScript must
run in Pi (the webfetch tool). They communicate through Pi's JSONL RPC protocol.
Consolidating the entry points does not mean combining session contexts or tools.

## Start here

- `plugin/ai.lua`: your local settings; the single Neovim entry point.
- `lua/ai/config.lua`: all default options, with no credentials.
- `lua/ai/init.lua`: commands, mappings, autocmds, and shutdown registration.
- [Usage and safeguards](../AI_COMMENTS.md): comment markers and commands.

The implementation uses Neovim 0.12+ APIs (`vim.uv`, `vim.fs`, Tree-sitter) and
Pi's current RPC protocol including `agent_settled`. The config's native package
loader uses `vim.pack`. Keep `pi` on Neovim's PATH and configure provider
credentials through Pi, never through this plugin.

## Module map

```text
plugin/ai.lua                setup and local overrides
lua/ai/
  init.lua                  public setup; all global registrations
  config.lua                model tiers, mappings, limits, UI dimensions
  prompts.lua               model-facing chat and comment instructions
  project.lua               canonical paths and buffer project lookup
  protocol.lua              JSONL framing, text blocks, stream reconstruction
  rpc.lua                   process/pipes, response IDs, deadlines, shutdown
  session.lua               stable IDs, tool policies, model/thinking handshake
  chat.lua                  web-chat queue and events
  comments/
    init.lua                saved-comment queue and request lifecycle
    markers.lua             marker grammar, fallback comment leaders, FIFO helpers
    scanner.lua             Tree-sitter first; fallback only if unavailable
    treesitter.lua          actual comment-node traversal
    files.lua               disk/buffer comparison and exact-marker cleanup
    storage.lua             handled-marker fingerprints
  ui/
    view.lua                shared float, input buffer, log and auto-scroll
    markdown.lua            Markdown parser/injections and code-block decoration
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
  models = {
    -- Keep the tier names: single markers select luna, doubled markers select opus.
    luna = { provider = 'your-provider', id = 'your-model' },
    opus = { provider = 'your-provider', id = 'your-reasoning-model', thinking = 'medium' },
    sol = { provider = 'your-provider', id = 'your-chat-model' },
  },
  mappings = { project = '<leader>aip', chat = '<leader>aic' },
  comments = { enabled = true, prompt_tier = 'opus' },
  chat = { tier = 'sol' },
  ui = { width = 0.8, height = 0.75, conceallevel = 0 },
  limits = { history_lines = 350, response_bytes = 20000 },
})
```

Set either mapping to `false` to disable it. Set `comments.enabled = false` to
stop automatic saved-marker dispatch (commands and manual prompts remain).
Typed project prompts use Opus 5.5 by default; `prompt_tier` does not change
marker routing. Single markers use Luna, doubled markers use Opus, and general
web chat uses Sol with its separate web-only tool loadout.
The default model names reflect this configuration's LEGO gateway; other users
must supply models available in their own Pi configuration.

A resumed model mismatch is deliberately refused. Stop the relevant session,
then choose a new session identity or manage the existing session in Pi if you
change a tier's model; don't silently replay a different model's context.

### Instructions and tool permissions

Edit `prompts.lua` to change wording. Edit `session.lua` to change CLI loadouts:

| Workflow | Tools/resources |
|---|---|
| Edit | Inherits Pi's normal tools, extensions, resources and trust policy |
| Question | Only `read,grep,find,ls`; extensions disabled |
| Web chat | Only `web_search,webfetch`; explicit extensions; no context files, skills or templates |

The native-search implementation remains the pinned external package
`npm:pi-web-search@1.6.0`; we do not vendor or rewrite it. Chat requires a
provider/gateway supporting that package's native search. Change its version
in `config.lua` or override `chat.search_extension`.

### Comment syntax and cleanup

Edit `comments/markers.lua` for supported comment leaders or marker grammar.
Edit `prompts.comment()` for nearby context selection. The scanner prefers
actual single-line comment nodes; its fallback is only a heuristic.

Keep cleanup in `comments/files.lua`. It checks that the buffer is loaded,
unmodified, Unix-format, within the file-size limit, and byte-for-byte equal to
the disk. It removes only the exact original marker, not nearby code. Altering
these checks can overwrite unsaved edits or dispatch the wrong request.

### Markdown and code snippets

Edit `ui/markdown.lua` for presentation and `ui/view.lua` for layout/input.
The buffer stays `ft=markdown` everywhere. Fenced languages are Tree-sitter
injections: install `markdown`, `markdown_inline`, and each code language's
parser. In this configuration the existing tree-sitter-manager ensures the
Markdown and Python parsers; install others with `:TSInstall <language>`.
Missing parsers do not prevent the float opening, but that language won't have
Tree-sitter highlighting. Fence tags are visible by default for readability.

## Request lifecycle

1. `BufWritePost` calls `comments.saved()`.
2. Resolve a canonical project root; compare disk and buffer; scan markers.
3. Build a bounded prompt and fingerprint; deduplicate and enqueue FIFO.
4. Start the appropriate `mode:tier` session on demand.
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

Old comment session IDs, chat session IDs, and the `stdpath('state')/ai-comments/`
fingerprint directory are preserved. Existing histories continue to resume.
Old Lua module names (`ai_comments`, `ai_chat`) and their two plugin entry points
are removed; consumers should use `require('ai').setup()`.
Commands remain unchanged, as do `<leader>aip` and `<leader>aic`.

Pi stores the full transcript. The Neovim view is bounded; restored responses
and streamed display are clipped from the start to preserve opening Markdown
structure. A display truncation notice points to the full Pi session. The log's
line limit can still cut older Markdown blocks; it is not a transcript archive.

## Sharing outside this dotfiles repo

Copy `lua/ai/` (including `pi-extension/`), the docs, and tests into a plugin repository. Put it on
Neovim's runtimepath and call `require('ai').setup(...)` from your configuration.
For manual setup, omit the dotfiles-specific `plugin/ai.lua`, or keep exactly one
entry point; an automatic setup runs before a later explicit setup can change it.
The companion lives in `lua/ai/pi-extension/` alongside the Lua modules, making
the AI package self-contained. Neovim does not execute its TypeScript files;
Pi loads `index.ts` explicitly. The path is resolved relative to
`lua/ai/config.lua`, not to `~/.config/nvim`, so package installs work too.

The Pi manifest exposes only `index.ts`, preventing helper files from being
loaded as independent extensions. Its host-provided packages are peer dependencies.
It is marked private to prevent accidental publication; review name, license,
version and dependency policy before publishing. Neovim loads the companion
explicitly for chat; don't also autoload it into all Pi edit/question sessions.

## Tests

```sh
bash tests/run_ai.sh
```

The web tests require Node.js 22.18+ (native TypeScript stripping) and use mocked
fetch responses, not network requests. Shared UI tests cover draft retention,
multiline submission and resize behavior, including small editors.

Offline tests cover markers, fallback/Tree-sitter scanning, cleanup, queues,
model-tier isolation, process exit/restart, Markdown language injections,
response framing, multi-block streaming, restored string messages, model
mismatch, startup timeout, and idempotent unified setup. The mock executable is
`tests/bin/pi`. They require the Lua parser for scanner coverage; Markdown
rendering tests require Markdown parsers. Python-specific coverage runs when
its parser is available.

`tests/ai_comments_live.lua` is an **opt-in**, billable real-provider check in a
disposable directory; see the usage guide. It is not run by the offline suite.
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
