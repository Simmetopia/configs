# Neovim Pi Profiles Design

**Status: final planning proposal; implementation awaits user confirmation of the final plan.** The user selected practical sharing, not complete isolation. This document supersedes the strict-isolation measures in the earlier external `profiles/proposal.md`. No implementation or global configuration changes are authorized by this planning run.

## Goal and boundaries

Give Neovim arbitrary, independently resumable Pi profiles while terminal Pi keeps its powers. Neovim sessions automatically load no Superpowers, skills, prompt templates, themes, context instructions, MCP, or discovered/configured extensions. Only the explicitly selected companion and web-search extensions load where needed.

- Share the existing `models.json` when explicitly configured; ordinary Pi authentication remains available, including OAuth, provider environment/ambient credentials, interpolation and credential commands.
- Preserve HOME/XDG, PATH, provider/proxy/search environment and tool subprocess behavior. Override only `PI_CODING_AGENT_DIR` in the production child environment and explicitly set session storage.
- No isolated HOME/XDG, credential allowlist, zero-scanning claim, outbound block, OS sandbox, project-mutation guarantee, or ledger redesign.
- Preserve all preexisting dirty/untracked files. No staging, commits, dependency updates, global edits, paid/model calls or subagents during planning.
- Development routing: **Sol high plan → Luna high implement → Terra high review → Sol high collect**. Independent implementation review is required later; planning launches none. Planning-only no-agent/no-model-call restrictions do not prohibit this user-mandated routing after final-plan confirmation.

## Decision: retain CLI/RPC, gated by an installed-Pi probe

Keep the existing Lua/libuv CLI subprocess and JSONL RPC transport. Installed Pi **1.5.0** documents the suppression flags and exposes the same resource-loader options to replacement runtimes. Embedded source shows:

```text
systemPromptSource = this.systemPromptSource ?? this.discoverSystemPromptFile()
appendSources = this.appendSystemPromptSource
if (!appendSources) { /* discover APPEND_SYSTEM.md */ }
```

The parser appends the argument to an array even when it is `""`; `resolvePromptInput("")` returns undefined, yielding no appended text. Thus explicit mode text plus an empty append argument suppresses both SYSTEM and APPEND discovery. **System replacement alone does not suppress append discovery.** Pi may still add ordinary tool/environment metadata to the built prompt: `customPrompt` is a prefix/input, not a promise of a byte-identical complete system prompt.

CLI is the smallest change for the accepted practical boundary. The earlier SDK recommendation answered a superseded zero-discovery/credential-isolation requirement. The installed distribution advertises SDK exports into `dist/` but has no such importable tree; SDK would add provisioning and runtime work. Do not migrate speculatively. Before implementing the profile migration, require a model-free installed-Pi probe of startup, `new_session`, resume and actual explicit extensions. If unwanted instruction/workflow loading remains that these controls cannot reasonably suppress, stop and seek approval for a bounded SDK alternative.

**Evidence inspected in this run (not runtime proof):** current `lua/ai/{config,session,rpc,session_ids,init,help,chat,prompts}.lua`, `comments/{init,storage}.lua`, `ui/view.lua`, `plugin/ai.lua`, tests and `docs/ai.md`; installed `docs/{cli,security,models,packages,extensions,rpc-commands,rpc-extension-ui}.md` under `/Users/dk8SimBu/.local/share/mise/installs/pi/latest/pi/`; corresponding embedded parser/resource-loader/runtime source via `strings`. No real Pi probe or credential command was executed. The existing offline suite passed all nine groups.

## Setup and model/auth preparation

`setup()` requires `active_profile` and a nonempty `profiles` map. Each arbitrary nonempty profile name requires a distinct canonical `agent_dir` and `models.chat`; `models_file` is optional. Reject unknown active profiles, terminal-agent-directory reuse, duplicate aliases, malformed present descriptors and empty provider/ID. Canonicalize through the nearest existing ancestor when a directory is not yet present, and recheck after lazy creation; do not use names as filesystem paths.

A descriptor is `{ provider: string, id: string, thinking: string }`. Omitted thinking normalizes to `off`. Validate the Pi 1.5.0 enum `off,minimal,low,medium,high,xhigh,max` at setup, then query supported levels and verify exact effective state at startup before exposing history or accepting prompts. Reject unsupported or clamped thinking and model mismatches. **Only omitted cheap/expensive inherit the entire normalized chat descriptor, including thinking.** Present descriptors are not field-merged with chat or LEGO defaults.

Planned local registration (not applied now):

```lua
require('ai').setup({
  active_profile = 'lego',
  profiles = {
    lego = {
      agent_dir = vim.fn.expand('~/.local/share/pi-nvim/lego'),
      models_file = vim.fn.expand('~/.pi/agent/models.json'),
      models = {
        chat = { provider = 'lego-openai', id = 'gpt-6.1-sol-2026-09-29', thinking = 'high' },
        cheap = { provider = 'lego-openai', id = 'gpt-6-luna-2026-09-22', thinking = 'high' },
        expensive = { provider = 'lego-anthropic', id = 'eu.anthropic.claude-opus-5-5', thinking = 'medium' },
      },
    },
  },
  chat = {
    -- Explicit existing local package, not an npm: source that installs into a fresh profile.
    search_extension = vim.fn.expand('~/.pi/agent/tmp/extensions/npm/f35b2129/node_modules/pi-web-search/src/index.ts'),
  },
})
```

The exact LEGO IDs above exist in current config/model metadata. Both LEGO provider entries structurally contain an `apiKey` source; this inspection did not disclose, execute or validate it.

Prepare directories lazily before launch/switch. When `models_file` is set, require its resolved target to be a readable regular file. Create `<agent_dir>/models.json` as a symlink only when absent according to **lstat**. Accept an existing symlink resolving to the configured source. Reject regular-file, directory, dangling-link or different-target conflicts without overwriting/deleting anything; recheck a creation race and accept only a matching winning link. If no source is set, leave existing model files alone.

Shared model credential/header sources stay shared, including literals, environment interpolation and `!command`. Profile `auth.json` is independent by default: no copying or implicit terminal-auth link. No new shared-auth setting is needed initially. If the shared sources/environment do not suffice, use normal Pi login or provider setup for that agent directory. Never print credentials; do not claim full credential separation. Terminal settings/instructions/auth/model files must remain unchanged.

## Launch and explicit extension policy

Every workflow receives these argv elements:

```text
--mode rpc --no-approve --no-extensions --no-mcp
--no-skills --no-prompt-templates --no-themes --no-context-files
--system-prompt <plugin-owned mode text> --append-system-prompt <empty-string>
--provider <provider> --model <exact-id> --thinking <level>
--session-dir <canonical-agent-dir>/sessions
```

`<empty-string>` is a real empty argv element, not literal shell quotes. There is no `--models-file` CLI flag. Persistent modes also receive `--session-id`; selection receives `--no-session` and revalidates state/capabilities after each RPC `new_session`.

| Mode | Active tools | Explicit extensions |
|---|---|---|
| edit/manual | `read,bash,edit,write` | none |
| question | `read,grep,find,ls` | none |
| selection | `read,grep,find,ls,replace_selection` | companion |
| chat | `web_search,webfetch` | pinned local web-search entry, companion |

Every mode prompt prohibits automatic skill/workflow bootstrap. Preserve live-buffer authority, selection merging/review and existing webfetch safeguards. Edit remains intentionally edit-capable; tools may read instructions when explicitly requested. These are workflow controls, not a sandbox or an absolute behavioral guarantee against instructions encountered through tools.

### Web extension availability and cost

Keep `chat.search_extension` as an explicit **local** entry-point path to `pi-web-search@1.6.0`. The current cache entry in the setup example has matching package metadata and manifest. A new profile does not own that cache, but can load the selected local file and its dependencies without copying terminal settings or enabling resource discovery. Reject npm/git/URL specifications for this option; never install/download as a launch fallback. Require readable entry/manifest, package name/version/declared entry consistency, and an installed-Pi compatibility probe. Users without this local package must provision a complete pinned package separately before enabling chat; no automatic provisioning or global mutation is included. Cache deletion/movement causes a visible error; this machine-specific path is not a portable default.

Before chat/selection becomes ready, the companion's model-free `/nvim_ai_capabilities` command reports active tool names through RPC `setStatus` (not transcript messages). Confirm the command exists via `get_commands` before invoking it; never send a missing command as a prompt that could reach the model. Require the handled-command acknowledgment and exact capability set, so a missing web extension/dependency cannot silently yield tool-less chat. Repeat on selection replacement sessions. Fail visibly without enabling discovery. The installed probe also exercises a fresh profile using the actual local package and the missing-package/dependency failure cases.

The search package honors inherited `PI_WEB_SEARCH_CONFIG`, otherwise `<agent_dir>/web-search.json`. A configured search model can differ from the chat descriptor and use separate authentication/cost; without a config it uses the current supported chat model, not an automatic fallback. Preserve this behavior, disclose it, and do not restrict ordinary credentials. Native search/gateway compatibility and billable search calls remain unverified; a model-free probe proves loading, not search operation. Existing webfetch caveats still apply.

`--no-approve` suppresses trust-gated project settings/resources even for trusted projects. Pi still discovers paths, reads project `sessionDir` before trust (explicit `--session-dir` wins), and can perform startup migration/probing. Profile-local nonresource settings can remain. Passing inherited environment unchanged except agent directory is intentional. This is the user-selected “good enough” separation.

## Identity, routes and restoration

New `Identity` fields are `version='profiles-v1'`, `profile` (name), canonical `agent_dir`, canonical `root`, `mode`, `role`, `provider`, `id` and `thinking`. Serialize the ordered fields unambiguously and hash them for pointer filenames under `stdpath('state')/ai-profile-sessions/`. First use creates/persists a fresh UUID; never consult old `ai-sessions` pointers, legacy deterministic IDs or terminal transcripts. Transcripts stay under the profile session directory. Selection is ephemeral. Model-history caches and selection workers include profile-aware identities; project/chat views and drafts belong to a profile/root and never show another profile's context.

| Route | Role |
|---|---|
| web chat | chat |
| single edit/question marker; ordinary AIHelp | cheap |
| doubled marker; AIHelp bang or leading `!` | expensive |
| manual project conversation | cheap by default, edit-capable |

`AINew` resets only the configured manual edit-role conversation, cheap by default and shared with cheap-edit markers; not question/other-role histories or fingerprints. `AIChatNew` resets only chat. Both clear that conversation's view/draft as today. `AIHelpModel[!]` accepts/completes `chat,cheap,expensive` via `help.roles()`. Defaults: `help.role='cheap'`, `help.bang_role='expensive'`, `comments.prompt_role='cheap'`; web chat always uses `chat`. Help overrides are per-profile, memory-only, restored on switching back and reset to setup defaults on Neovim restart. No `luna/opus/sol` tier API or inherited LEGO model defaults remain.

## Safe on-demand switching

`:AIProfile <name>` completes configured names; no argument opens a picker. Current profile is normally a no-op. Show active profile/role/provider/ID/thinking and transition status without secrets.

Refuse switching if **any root/workflow** is running, queued, starting, resetting, stopping, compacting/retrying/unsettled, awaiting deferred delivery, or has unresolved/open selection review. No force, implicit abort or queue transfer. Keep the acceptance-plus-`agent_settled` gate; `agent_end` is not idle.

Idle switch validates/prepares the target first, locks every ingress, retires the generation, hides old views without destroying drafts, and stops every client including idle selection workers. Gracefully close stdin, retain the SIGTERM deadline, and publish target only after confirmed exits. Target workers start lazily. A timeout leaves the old profile selected in stopped/error state with ingress blocked. Once actual exits occur, retry `AIProfile` explicitly, including the current name for recovery; do not publish asynchronously after a reported timeout.

Saves during transition retain markers and notify **“resave after switching”**; never dispatch automatically into the new profile. Generation tokens plus session-slot ownership guard scheduled dispatch, responses/events, exit/reset restarts, deferred delivery, reviews and picker callbacks. Retired clients still complete transport cleanup/exit accounting. Reactivated cached views get current-generation ingress bindings; old delayed callbacks stay retired. Failed target validation leaves old state, views and workers intact.

## Minimal replay protection

Keep the current root-global `stdpath('state')/ai-comments/` file and marker fingerprints. Memoize one live handled table per canonical root, shared across profile views; consult it at every saved-marker enqueue in addition to per-view `seen`. This prevents A→B→A replay even when B was cached before A handled a retained marker. Model history remains separate.

Do not redesign persistence. Current capacity behavior (>1,000 entries skips persistence), corrupt-load/I/O behavior, cross-process races and crash limitations remain. In-process deduplication is not crash-safe exactly-once execution. No locking, atomic-ledger rewrite, reconciliation workflow or credential/network redesign is included.

## Approval and implementation gates

See [the implementation plan](../plans/2026-11-07-ai-profiles.md). The earlier review's two P1 blockers are addressed in that plan by a single Tasks 1–4 integration gate and explicit local web-extension loading/readiness checks. Its P2 findings are addressed by migrating `docs/ai.md` with the API and documenting search-model overrides. Remaining gates: user confirmation, installed-Pi probe, full migrated offline suite, independent Terra implementation review and Sol collection. Nothing here claims those gates have already passed.
