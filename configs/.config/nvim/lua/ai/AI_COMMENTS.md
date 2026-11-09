# Neovim AI: Pi comments and web chat

One plugin, configured through `require('ai').setup(options)`. Start with
[the architecture and customization guide](../../docs/ai.md) for a module map,
installation, sharing, and the request lifecycle. Local overrides live in
`plugin/ai.lua`; reusable implementation lives in `lua/ai/`.


Requires Neovim with `vim.pack` and `vim.uv` (the installed 0.13 dev build works),
`pi` on Neovim's `PATH`, and providers configured for the selected profile. The
local LEGO profile declares `chat`, `cheap`, and `expensive` model descriptors;
`:AIProfileStatus` reports the selected provider/model/thinking without exposing
credentials. Its `models_file` explicitly links the shared model catalogue into
the separate Neovim agent directory. Profile `auth.json` is not copied from
terminal Pi; use provider environment variables or Pi's normal authentication
setup directed at the profile agent directory when the shared model sources do
not suffice. Pi's usual project trust/permission behavior applies; the plugin
does not approve projects or bypass tool restrictions.

Open a saved file inside a Git project (or inside the Neovim working directory
if there is no `.git`). Save a comment such as:

```python
# AI. Consider the caller's contract
# AI! Fix the null case (cheap role)
value = compute()  # Why is this branch needed? AI?
# AI!! Refactor this carefully (expensive role)
value = compute()  # Explain the trade-offs AI??
```

`AI!` requests edits and `AI?` asks a read-only question using the `cheap` role.
`AI!!` and `AI??` use `expensive`. These are profile roles, not aliases for a
particular provider/model. `AI.` supplies context
from preceding nearby comments without dispatching anything. A marker can appear
at the beginning or end of the comment, case-insensitively. Supported comment
leaders are `#` (Python, shell, YAML, TOML, Ruby), `//` (C-family, JS/TS,
Go, Rust, Swift), `--` (Lua, SQL), and `;` (Lisp, INI); see
`lua/ai/comments/markers.lua` for the exact filetype list. The marker must be saved
by this Neovim instance; no repository scan occurs.

- `<leader>aip` / `:AIToggle`: show/hide the project conversation. `q` hides it;
  hiding never stops Pi. Press `i` inside the conversation to type an ordinary
  edit-capable prompt using `comments.prompt_role` (cheap by default); `<Enter>` submits, `<Esc>` closes it
  without discarding your draft. Paste multiple lines or use insert-mode `<Ctrl-J>`
  for a newline; `<Ctrl-S>` sends the whole draft in normal or insert mode.
  Prompts include a file reference to the saved file buffer from which you opened
  the conversation (not a copy of its contents or unsaved changes). Opening from
  another file updates that reference. Both floats reposition automatically when
  Neovim is resized.
- `<Ctrl-L>` in either conversation clears its displayed history. `:AIClear`
  clears project output; `:AIChatClear` clears web-chat output. This does not
  reset Pi's conversation context, discard queued requests, or abort a response.
  Active responses remain visible; reconnecting may restore persisted history.
- `:AIChatNew`: start a fresh `chat`-role conversation for a new topic, clearing old output
  and the draft without carrying over conversation context.
- `:AINew`: start a fresh edit conversation for `comments.prompt_role` (cheap by default; `AI!` uses the same role).
  Other edit and question histories remain unchanged.
  New-conversation commands refuse while work is active, queued, or connecting;
  finish it or stop and wait for exit first. Old Pi transcripts are kept on disk,
  and the new session identity is saved so reconnects/Neovim restarts resume it.
  Project files and normal project instructions are not reset by `:AINew`.
- `:AIStatus`: project connection and queue status.
- `:AIAbort`: discard local queued requests and abort the active request.
- `:AIStop`: close all project RPC sessions and discard pending work.
- `:AIRestart`: reconnect project sessions after they exit or stop (wait for all
  stopped processes to exit first). Saved markers remain on disk while stopped;
  explicitly resave them to retry.

`:AIProfile` opens a picker; `:AIProfile <name>` switches profiles only when
all chat, comment, and selection work is idle, and `:AIProfileStatus` reports
the active profile, model roles, and transition state. Each profile has its own
Pi agent directory, session history, authentication file, and help-role
overrides. `models_file` may explicitly symlink a shared read-only model
catalogue into that profile; it never shares `auth.json`. Profile model IDs and
thinking levels are command-line selections and contain no provider credentials.
Switches refuse active, queued, connecting, unsettled, or unresolved work across
cached projects/workflows. A timeout keeps the old profile selected and locks
workflow ingress until its Pi processes exit and you explicitly retry
`:AIProfile` (including the current name for recovery). Retired callbacks do not
revive after switching back. A save during a transition retains its markers;
resave after switching or recovery to dispatch them.

Pi starts on demand in RPC mode with the project root as its working directory.
Each profile has independent persisted chat/comment/help sessions and a separate
agent directory. Identities include the profile, role, model, and project, so
histories resume only in their matching profile; profile views and drafts are
cached independently. Single markers use `cheap`; doubled markers use
`expensive`; ordinary manual prompts use `comments.prompt_role` (`cheap` by
default) in an edit-capable session, shared with the single-edit markers.
Questions use read-only `read,grep,find,ls` tools with extensions disabled; they
do not share edit-session context. Read tools can still access any file Pi itself
can read.

Tool progress shows compact commands, file paths, or search terms while running,
then completion/failure and elapsed time. Summaries are limited to 140 characters;
tool output and edit contents are not displayed.

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

## Selection help (async)

Select text, press `<leader>aih`: the command line shows `:'<,'>AIHelp `; type
the instruction and press Enter. Ordinary `:AIHelp` uses the active profile's
`help.role` (`cheap` by default); `:AIHelp!` or an instruction starting with
`!` uses `help.bang_role` (`expensive` by default). `:AIHelpModel <role>` and
`:AIHelpModel! <role>` accept `chat`, `cheap`, or `expensive` and change only the
current profile's in-memory override. `:AIProfileStatus` reports both roles.

Keep working while it runs. The selection is highlighted with a `AI (role)
working…` hint. Pi gets read-only tools plus `replace_selection` (in a separate,
ephemeral session with fresh context per job), so it never writes files. Neovim
applies the proposal to the live buffer (unsaved, one undo step), and waits if
you are in insert mode there. If you edited the selection meanwhile, the change
is three-way merged (`git merge-file`). If the merge conflicts, nothing is
applied, the region is marked, and `:AIHelpReview` shows a diff (`ga` apply, `gx`
discard, `q` close). Results only notify. Answers and logs go to the
`<leader>aip` view. `:AIHelpAbort` cancels pending jobs.

## General web chat

`<leader>aic` / `:AIChat` opens a separate project-scoped chat float. Press `i`
to enter a prompt, `<Enter>` to send, `q` to hide. `:AIChatStop` shuts down its
Pi process; `:AIChatRestart` reconnects after it exits. The conversation uses
its own persisted project session, independent from comment requests and their
queue. From a scratch buffer it uses Neovim's current directory.

The chat starts Pi with **only** `web_search` from an explicitly configured
local `pi-web-search@1.6.0` entry point and a standalone `webfetch` tool in
`lua/ai/pi-extension/index.ts` (tool implementation in `lua/ai/pi-extension/tools/webfetch.ts`). It loads these only for chat; other Pi extensions, project
context files, skills, and prompt templates are disabled. For a prompt such as
"read this URL and recap it", the agent calls `webfetch` to read the page.
`webfetch` supports HTML and plain-text pages up to 2 MB, returns at most
20,000 characters, has a 20-second deadline (including body reading), and does
not follow redirects; PDFs, JavaScript-rendered
pages, and authenticated sites may not work. `web_search` normally uses the configured model's native search (OpenAI Responses
or Anthropic Messages). No Exa or Brave key is needed unless you configure a
separate search provider. `PI_WEB_SEARCH_CONFIG` is inherited when set;
otherwise the extension may read `web-search.json` from the active profile's
agent directory. A search-model override may use different credentials and incur
separate costs. This machine's profile uses the `chat` role's LEGO OpenAI model,
but the gateway's native-search compatibility is not verified by offline tests.
The local extension cache is machine-specific: users must provision the pinned
package and its dependencies themselves; a missing/moved entry fails visibly
without an automatic install or fallback. Web content is untrusted data, not
instructions. This is a model tool allowlist, not a security sandbox for Pi or
a network isolation mechanism.

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

Prepare a disposable profile agent directory with Pi's normal provider
credentials (or credential environment variables), and provide the model
catalogue explicitly. The fixture keeps the profile agent directory below the
separate disposable parent and does not remove it, so existing auth is preserved.
For example:

```sh
AI_TEST_BASE=/path/to/existing/disposable-parent \
AI_TEST_MODELS_FILE="$HOME/.pi/agent/models.json" \
  nvim --headless -u NONE -l tests/ai_comments_live.lua
```

The test uses `$AI_TEST_BASE/ai-comments-live-profile/agents/workbench` as its
isolated agent directory. Provision its authentication with Pi before the test;
do not point it at your terminal agent directory. The generated project alone is
removed after success; failed projects and profile state are retained for
inspection. This uses real provider credentials and may incur charges.
