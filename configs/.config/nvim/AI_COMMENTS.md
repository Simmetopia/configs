# Neovim AI: Pi comments and web chat

One plugin, configured through `require('ai').setup(options)`. Start with
[the architecture and customization guide](docs/ai.md) for a module map,
installation, sharing, and the request lifecycle. Local overrides live in
`plugin/ai.lua`; reusable implementation lives in `lua/ai/`.


Requires Neovim with `vim.pack` and `vim.uv` (the installed 0.13 dev build works),
`pi` on Neovim's `PATH`, and the configured LEGO provider with credentials.
No extra Neovim package, watcher, or terminal is needed. This setup's
`~/.pi/agent/models.json` and `settings.json` already configure LEGO models;
check readiness with `pi auth check --provider lego-openai --no-refresh` and
`pi auth check --provider lego-anthropic --no-refresh` if needed. The plugin
selects Luna or Opus 5.5 explicitly and refuses a resumed session using a
different model. Pi's Anthropic SDK appends `/v1/messages`, so the Pi LEGO
Anthropic base URL ends in `/anthropic` (unlike OpenCode's `/anthropic/v1`).
Opus 5.5 starts with medium thinking; Pi's default "off" setting is rejected
by the gateway for this model. Restart existing Opus processes with `:AIStop`,
then `:AIRestart` after they exit. Pi's usual project trust/permission behavior applies; the plugin
does not approve projects or bypass tool restrictions.

Open a saved file inside a Git project (or inside the Neovim working directory
if there is no `.git`). Save a comment such as:

```python
# AI. Consider the caller's contract
# AI! Fix the null case
value = compute()  # Why is this branch needed? AI?
# AI!! Refactor this carefully with Opus 5.5
value = compute()  # Explain the trade-offs with Opus 5.5 AI??
```

`AI!` requests edits and `AI?` asks a read-only question using **Luna**.
`AI!!` and `AI??` do the same with **Opus 5.5**. `AI.` supplies context
from preceding nearby comments without dispatching anything. A marker can appear
at the beginning or end of the comment, case-insensitively. Supported comment
leaders are `#` (Python, shell, YAML, TOML, Ruby), `//` (C-family, JS/TS,
Go, Rust, Swift), `--` (Lua, SQL), and `;` (Lisp, INI); see
`lua/ai/comments/markers.lua` for the exact filetype list. The marker must be saved
by this Neovim instance; no repository scan occurs.

- `<leader>aip` / `:AIToggle`: show/hide the project conversation. `q` hides it;
  hiding never stops Pi. Press `i` inside the conversation to type an ordinary
  (edit-capable, Opus 5.5 with medium thinking) prompt in the input float; `<Enter>` submits, `<Esc>` closes it
  without discarding your draft. Paste multiple lines or use insert-mode `<Ctrl-J>`
  for a newline; `<Ctrl-S>` sends the whole draft in normal or insert mode.
  Both floats reposition automatically when Neovim is resized.
- `:AIStatus`: project connection and queue status.
- `:AIAbort`: discard local queued requests and abort the active request.
- `:AIStop`: close all project RPC sessions and discard pending work.
- `:AIRestart`: reconnect the project's Opus edit session after it exits or stops
  (wait for the stopped process to exit first). Requests saved while stopped
  remain queued until restart; questions reconnect their own session as needed.

Pi is started on demand in RPC mode with the project root as its working
directory. Edit/question and Luna/Opus histories are **four separate persisted
project sessions**, selected by stable session IDs. They resume on Neovim/Pi restart;
the float restores recent assistant messages on reconnection. Ordinary prompts
go to the Opus edit session, shared with `AI!!` requests. Sol is reserved for
general web chat, not comment requests. Questions of either tier use `--tools read,grep,find,ls
--no-extensions`: Pi has no write/bash tools or extension tools in that session.
This also means questions cannot use extension commands or share edit-session
conversation context. Read tools can still access any file Pi itself can read.

Requests are FIFO per project. They are sent only after `agent_settled`, not
merely after prompt acceptance or `agent_end`. On successful completion the
plugin removes only the exact original comment, and only when the disk matches
an unmodified, loaded buffer. Inline code is preserved. If the file or buffer
changed, the comment remains; its handled fingerprint is retained in Neovim's
state directory so subsequent saves/restarts don't re-submit it. Change the
marker text (or line) to submit a new request. Failed/aborted requests retain
the comment and can be retried by saving again; a tool error that Pi later
recovers from during the same settled run does not block cleanup. Neovim `checktime` is used to
reload externally changed *unmodified* open buffers; dirty buffers are never
force-reloaded. Cleanup is limited to Unix-format files up to 2 MiB; larger,
non-Unix, or otherwise unsafe files keep their markers. Neither prompts nor
sessions are auto-committed.

When a Tree-sitter parser is available, only actual single-line comment nodes
are considered (including inline comments without preceding whitespace).
Otherwise the existing lightweight comment scanner is used; its heuristic
cannot fully parse every language (for example, multi-line string literals).
Inspect a marker before saving if fallback comment syntax is ambiguous.
UI conversation history is memory-limited; Pi's
persisted session holds the full history. Pi diagnostics on stderr are signaled
in the float without copying their potentially sensitive text into notifications.

## General web chat

`<leader>aic` / `:AIChat` opens a separate project-scoped chat float. Press `i`
to enter a prompt, `<Enter>` to send, `q` to hide. `:AIChatStop` shuts down its
Pi process; `:AIChatRestart` reconnects after it exits. The conversation uses
its own persisted project session, independent from comment requests and their
queue. From a scratch buffer it uses Neovim's current directory.

The chat starts Pi with **only** `web_search` from the pinned
`npm:pi-web-search@1.6.0` package and a standalone `webfetch` tool in
`lua/ai/pi-extension/index.ts` (tool implementation in `lua/ai/pi-extension/tools/webfetch.ts`). It loads these only for chat; other Pi extensions, project
context files, skills, and prompt templates are disabled. For a prompt such as
"read this URL and recap it", the agent calls `webfetch` to read the page.
`webfetch` supports HTML and plain-text pages up to 2 MB, returns at most
20,000 characters, has a 20-second deadline (including body reading), and does
not follow redirects; PDFs, JavaScript-rendered
pages, and authenticated sites may not work. `web_search` uses the active
model's native search (OpenAI Responses or Anthropic Messages). No Exa or Brave
key is needed: search uses the configured model's credentials.
The chat selects LEGO Sol (`gpt-6.1-sol-2026-09-29`); the gateway must support
that model's native web-search tool. Sol search support has not been verified
by the offline tests. Web content is untrusted data, not instructions. This is a model tool
allowlist, not a security sandbox for Pi or a network isolation mechanism.

Run all offline tests with `bash tests/run_ai.sh`. They use a mock RPC process
(no provider credentials needed). Individual integration tests:

```sh
AI_TEST_LOG=/tmp/ai-comments-test.log PATH="$PWD/tests/bin:$PATH" \
  nvim --headless -u NONE -l tests/ai_comments.lua
AI_TEST_LOG=/tmp/ai-chat-test.log PATH="$PWD/tests/bin:$PATH" \
  nvim --headless -u NONE -l tests/ai_chat.lua
```

To check real model edits, read-only questions, and cleanup for all four markers
in a disposable project (uses provider credentials):

```sh
AI_TEST_BASE=/path/to/existing/disposable-directory \
  nvim --headless -u NONE -l tests/ai_comments_live.lua
```
