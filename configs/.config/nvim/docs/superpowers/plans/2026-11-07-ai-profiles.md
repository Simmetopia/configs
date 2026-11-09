# Neovim Pi Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This is task-execution guidance, not an instruction to bypass the user-mandated Luna high implementation → Terra high review → Sol high collection routing after final-plan confirmation. This planning run launches no agents or paid/model calls; no automatic staging or commits are authorized.

**Goal:** Give Neovim arbitrary, independently resumable Pi profiles without automatically loading terminal Pi's powers.

**Architecture:** Retain the CLI/RPC subprocess integration with one separate `PI_CODING_AGENT_DIR` per profile and optional explicit sharing of `models.json`. Suppress automatic resources/instructions with verified CLI controls, explicitly load local companion/web extensions, and switch through a plugin-wide all-root idle coordinator. Profile-aware histories remain separate; handled-marker fingerprints remain root-global.

**Tech Stack:** Neovim Lua/libuv, installed Pi **1.5.0** CLI/RPC, existing TypeScript companion, local **pi-web-search@1.6.0**, Node/Python offline test harness.

**Spec:** [2026-11-07-ai-profiles-design.md](../specs/2026-11-07-ai-profiles-design.md). Read it before execution; the prior external proposal is background only.

**Approval gate:** **Implementation awaits user confirmation of this final plan.** This run writes documentation only. All unchecked steps below are future work, not work performed or authorized now.

## Global Constraints

- The user selected practical sharing, not complete isolation. Terminal Pi keeps its powers; never modify terminal settings/instructions/auth/model files.
- Share the existing `models.json` when explicitly configured; ordinary Pi authentication remains available, including OAuth, provider environment/ambient credentials, interpolation and credential commands.
- Preserve HOME/XDG, PATH, provider/proxy/search environment and tool subprocess behavior. Override only `PI_CODING_AGENT_DIR` in the production child environment and explicitly set session storage.
- No automatic Superpowers, skills, prompt templates, themes, context instructions, MCP, or discovered/configured extensions. Only the explicitly selected companion/web extensions load where needed.
- No isolated HOME/XDG, credential allowlist, zero-scanning claim, outbound block, OS sandbox, project-mutation guarantee, or ledger redesign.
- Preserve all preexisting dirty/untracked files. No staging, commits, dependency updates, global edits, paid/model calls or subagents during planning. These planning-only no-agent/no-model-call restrictions do not prohibit the user-mandated development routing after final-plan confirmation. No automatic staging/commits or billable provider/search/live tests are authorized by this plan.
- Development routing: **Sol high plan → Luna high implement → Terra high review → Sol high collect**. Independent implementation review is required later; planning launches none.
- Exact LEGO descriptors: chat `lego-openai/gpt-6.1-sol-2026-09-29/high`; cheap `lego-openai/gpt-6-luna-2026-09-22/high`; expensive `lego-anthropic/eu.anthropic.claude-opus-5-5/medium`.
- Only omitted cheap/expensive inherit the entire normalized chat descriptor, including thinking; present descriptors are not field-merged. Omitted thinking is `off`; Pi 1.5.0 levels are `off,minimal,low,medium,high,xhigh,max`.
- Preserve live-buffer authority, selection merging/review, marker grammar/fingerprints/cleanup, existing webfetch safeguards and current handled-ledger persistence limitations.

## Review Focus

1. Model-file conflicts, aliases and creation races must never replace user bytes — Task 1 `ai_profiles.lua` tests.
2. SYSTEM/APPEND precedence and replacement-session resource leakage must not introduce automatic instructions/workflows — Tasks 0/2/5 installed probe and argv tests.
3. Hidden-root queues, reset/stop/start and post-`agent_end` unsettled work must block switching — Task 3 all-root state matrix.
4. Retired events, exit/reset resurrection and deferred UI/application must not cross profiles — Task 3 ownership/generation tests, including open review/pickers.
5. A handled-but-retained marker must not replay through a previously cached B in A→B→A — Task 4 shared-ledger regression.

## File responsibilities and test gates

- `lua/ai/config.lua`: normalized setup schema/model lookup; no credential evaluation or inherited LEGO defaults.
- Create `lua/ai/profiles.lua`: canonical preparation, current profile/generation, transition coordinator and memory-only help overrides.
- `lua/ai/{session,rpc,session_ids,prompts}.lua`: launch policy/capability validation, transport/environment/confirmed exits, identity pointers and mode system text respectively.
- `lua/ai/{init,chat,help}.lua`, `lua/ai/comments/init.lua`, `lua/ai/ui/view.lua`: commands and guarded profile-aware workflow/UI ownership.
- `lua/ai/comments/storage.lua`: one live handled table per canonical root, without changing file format/limits.
- `lua/ai/pi-extension/index.ts`: model-free tool-capability command; keep existing tool modules.
- `plugin/ai.lua`: migrate local registration alongside the required schema; never change terminal config.
- Create `tests/{ai_config,ai_profiles,ai_comments_storage}.lua`, `tests/fixtures/ai_setup.lua`, `tests/ai_pi_probe.py`, `tests/fixtures/ai_pi_probe.ts`; extend existing source-named suites and `tests/bin/pi`.
- `tests/run_ai.sh`: retain the default offline suite; add new Lua groups and optional explicit group selection for targeted red/green cycles. Do not run installed/live probes implicitly.
- `docs/ai.md`, `lua/ai/AI_COMMENTS.md`: update setup, role, authentication, extension, switching/history and safety guidance.

**Tasks 1–4 are one compatibility migration with one full integration gate at the end of Task 4.** They change required setup, tier names, identity signatures and caches together. Use targeted red/green tests during Tasks 1–3; do not claim the entire suite or an intermediate product state is usable. Migrate *all* setup callers in Task 1 and interface assertions in their owning tasks. This avoids the draft's impossible per-task full-green gates. Task 0 is independently testable; Task 5 is the final installed-CLI/docs gate. No commits at task boundaries.

## Task 0: Model-free installed CLI feasibility gate

**Files:** Create `tests/ai_pi_probe.py`, `tests/fixtures/ai_pi_probe.ts`. Do not modify global settings, install packages or run models.

**Interfaces:** `python3 tests/ai_pi_probe.py --pi <absolute-executable> --timeout 60 --search-extension <absolute-local-entry>` exits 0 with per-mode/lifecycle/control PASS output, otherwise nonzero with redacted diagnostics. Explicit fixture command `/nvim_probe` snapshots `ctx.getSystemPromptOptions()`, `pi.getActiveTools()`, `pi.getCommands()` to a disposable fixture output; it does not prompt a provider.

- [ ] Write probe assertions for exact `customPrompt` mode text, empty context/skills/appended text, no sentinel command/resource/tool, and exact active tool sets from the spec at startup, after `new_session`, and after fixture resume. Permit Pi's ordinary tool/environment metadata; do not assert complete built-prompt byte equality.
- [ ] Build disposable agent/project/ancestor fixtures with AGENTS/CLAUDE/SYSTEM/APPEND, configured/discovered skills/templates/themes/extensions and harmless MCP sentinels, fake model/auth, explicit session storage and `cacheWarming='off'`. Negative controls selectively allow resources/trust or remove system/append overrides and must reveal the corresponding sentinels; if a control cannot detect its sentinel, the test is invalid. MCP controls use a local fixture executable, not a real server/network service.
- [ ] Implement the harness with `--offline`, no package specifications, no provider prompts, search/fetch/login/install or compaction. First query `get_commands`, require `nvim_probe`, then send the extension-handled `/nvim_probe` through RPC `prompt` and require `disposition='handled'`. Use fake fixture credentials, never shared credential commands; cleanup only owned fixtures. Missing local package/dependency fails without download. Offline disables automatic network work, not all outbound traffic; no OS network block is required or claimed.
- [ ] Run `python3 tests/ai_pi_probe.py --pi "$(command -v pi)" --timeout 60 --search-extension "$HOME/.pi/agent/tmp/extensions/npm/f35b2129/node_modules/pi-web-search/src/index.ts"`. Require all positive cases and detecting negative controls PASS, including a **fresh profile** loading the actual local companion/search entry and missing-package/dependency negative cases. Source inspection alone is insufficient.
- [ ] If the gate fails due to unwanted instruction/workflow loading that CLI controls cannot reasonably suppress, stop and request approval for a bounded SDK alternative. Do not proceed with strict isolation or silent fallback.

## Task 1: Profile schema, callers and non-destructive preparation

**Files:** Modify `lua/ai/config.lua`, `plugin/ai.lua`, `tests/run_ai.sh`, and every setup caller in `tests/{ai_view,ai_session,ai_chat,ai_comments,ai_new,ai_help,ai_comments_live}.lua`. Create `lua/ai/profiles.lua`, `tests/{ai_config,ai_profiles}.lua`, `tests/fixtures/ai_setup.lua`.

**Interfaces:**
- `ModelDescriptor = {provider:string, id:string, thinking:string}`; `Profile = {name:string, agent_dir:string, models_file?:string, models:{chat:ModelDescriptor, cheap:ModelDescriptor, expensive:ModelDescriptor}}`.
- `config.setup(options)->Options` asserts invalid input before registration/work; `config.profile(name)->Profile`; `config.model(profile:Profile, role:string)->ModelDescriptor` rejects unknown role.
- `profiles.prepare(profile:Profile)->true|nil,error` validates canonical directory/source/link state without replacing files.
- `fixtures.options(overrides?:table)->table` in `tests/fixtures/ai_setup.lua` supplies two arbitrary profiles, exact LEGO descriptors and disposable agent dirs/local fake search-package entry under `AI_TEST_PROFILE_DIR`; never references real credentials/cache. Runner owns and cleans that temp directory.

- [ ] Add `ai_config.lua` tests `requires_profiles_and_known_active`, `arbitrary_names`, `complete_chat_fallback`, `present_role_is_not_merged`, `thinking_enum`. Pin fallback with `assert(vim.deep_equal(config.model(p,'cheap'),config.model(p,'chat')))` and the same for expensive when both are omitted from a high-thinking chat profile; missing provider/ID in a present role and empty/unknown names must fail. Include non-table descriptors and `thinking='invalid'`.
- [ ] Add `ai_profiles.lua` tests `canonical_alias_and_terminal_reuse`, `prepare_absent_and_same_link`, `prepare_conflicts_preserve_bytes`, `prepare_creation_race`. Cover nonexistent dirs, nearest-ancestor symlink aliases, source symlinks to regular files, unreadable/nonregular sources, destination regular file/directory/dangling/different link, and matching/conflicting creation-race winners. Use a narrow fake libuv filesystem call to force the race, restoring it after the test; assert original bytes/link targets remain unchanged.
- [ ] Add targeted runner selection and fixture cleanup; run `bash tests/run_ai.sh ai_config ai_profiles`. Expect profile-schema/preparation assertions FAIL before implementation, not a provider/fixture error.
- [ ] Implement normalization without deep-merging role descriptors with defaults, canonicalize using existing ancestors and recheck after mkdir, reject duplicate/terminal directory aliases, and implement lstat-based symlink preparation. Terminal directory is the inherited `PI_CODING_AGENT_DIR` or `~/.pi/agent`; do not rewrite either.
- [ ] Migrate local registration to the spec's exact profiles/models/local search path; migrate all setup callers to the shared test fixture, including the opt-in live test's explicit caller configuration. Keep the live test opt-in; **do not run it**. Update enum/role-option names to `help.role`, `help.bang_role`, `comments.prompt_role`; web chat uses `chat`.
- [ ] Run `bash tests/run_ai.sh ai_config ai_profiles`. Require PASS and no fixture residue. Old workflow/identity assertions may remain red until their owning tasks; do not claim full-suite PASS here.

## Task 2: Launch policy, extension readiness and independent identity

**Files:** Modify `lua/ai/{session,rpc,session_ids,prompts}.lua`, `lua/ai/pi-extension/index.ts`, `tests/{ai_session,ai_chat,ai_new,ai_help}.lua`, `tests/bin/pi`; extend `tests/ai_pi_probe.py` as needed for capability coverage.

**Interfaces:**
- `Identity = {version='profiles-v1',profile:string,agent_dir:string,root:string,mode:string,role:string,provider:string,id:string,thinking:string}`.
- `session.identity(root,mode,role,profile?:Profile)->Identity`; `session.id(identity)->string|nil,error` loads or persists a fresh UUID; `session.args(root,mode,role,profile?:Profile)->string[]|nil,error` uses a captured profile and explicit identity.
- `session.start(root,mode,role,hooks)->Session|nil,error` captures profile/token; `session.check_state(session,done)` invokes `done(ok:boolean,error?:string)` once after exact model/thinking/capability checks. Retain existing hook shapes and `send/stop` APIs.
- `rpc.spawn(root,args,hooks,env_overrides?:table)->Client|nil,error` merges only supplied environment overrides. `session_ids.load(identity)->string|nil`; `session_ids.fresh(identity)->string|nil,error` keeps atomic pointer writes under `ai-profile-sessions`. `prompts.system(mode)->string` supplies all four mode prompts.
- Companion `/nvim_ai_capabilities` calls `ctx.ui.setStatus('nvim-ai-capabilities',JSON.stringify({tools:pi.getActiveTools()}))`. RPC event fields are `type='extension_ui_request',method='setStatus',statusKey='nvim-ai-capabilities',statusText=<JSON>`. No transcript/custom messages, secrets or model work.

- [ ] Add `ai_session.lua` cases `all_mode_launch_policy`, `profile_env_and_no_legacy_resume`, `exact_thinking_after_adjustment`, `selection_replacement_revalidates`, `local_extension_readiness`. Assert every suppression flag, exact mode tools, provider/ID/thinking and session dir, adjacent `--append-system-prompt`/`''` elements, preserved PATH/provider/proxy/credential-command environment, and only agent-dir override. Reject missing/moved entry, wrong package name/version/manifest, npm/git/URL source, extension errors, missing capability command/tool and failed dependency loading before ready. Do not require physical copies of Pi-mapped peer dependencies; actual host resolution is checked by the installed gate.
- [ ] Replace legacy deterministic-ID and Luna-role assertions in the session/chat/new/help suites with Identity assertions. Add `identity_fields_partition_history` varying each field, `legacy_pointer_ignored`, `resume_same_profile`, `reset_one_conversation`; seed legacy pointers/transcripts and prove no import. Fixture histories must be keyed by profile/session directory as well as UUID.
- [ ] Extend fake Pi to log argv and safe test-only env fields, accept arbitrary fixture model pairs, explicitly classify `read,bash,edit,write` as edit, report `get_available_thinking_levels`, mismatch/clamping/reset behavior, and model-free `get_commands`/capability command status events. Run `bash tests/run_ai.sh ai_session`; expect new policy assertions FAIL before product changes.
- [ ] Implement suppression argv and local pinned-entry validation, profile-only agent-dir override, explicit session dir and new identity namespace. Use ordered length-safe identity serialization rather than ambiguous delimiter concatenation. Never fall back to legacy IDs; persistent first launch must save a fresh pointer or fail visibly.
- [ ] Implement startup validation: `get_state`, `get_available_thinking_levels`, optional `set_thinking_level`, then **re-read get_state** and reject mismatch/clamping before `get_messages` or prompts. For chat/selection require the registered capability command before sending it, then both handled acknowledgment and exact tool status; missing command must never be sent. Repeat `check_state` after successful selection `new_session` before the job prompt. Guard capability events and callbacks by session ownership/token; maintain startup deadlines and sanitized errors.
- [ ] Implement plugin-owned system text for every mode, retaining existing chat and live-selection rules and prohibiting automatic skill/bootstrap workflows. Run `bash tests/run_ai.sh ai_session`. Require new launch/identity/state assertions PASS; full migration gate remains Task 4.

## Task 3: All-root switching, guarded workflows and cached views

**Files:** Modify `lua/ai/{profiles,init,rpc,chat,help}.lua`, `lua/ai/comments/init.lua`, `lua/ai/ui/view.lua`, `tests/{ai_profiles,ai_help,ai_new,ai_view}.lua`, `tests/bin/pi`.

**Interfaces:**
- `Token={name:string,generation:integer}`; `profiles.current()->Profile`; `profiles.token()->Token`; `profiles.allows(token)->boolean` is false during transition/error lock or for retired generations.
- `profiles.status()->{active:string,phase:'idle'|'switching'|'error',target?:string,error?:string}`; `profiles.switch(name:string,done)` reports `done(ok:boolean,error?:string)` exactly once (including refusal/no-op); no force option.
- `chat.busy_reason()`, `comments.busy_reason()`, `help.busy_reason()->string|nil` inspect **all roots/caches**; each exports `retire()` to hide/preserve views and suppress workflow restarts. `rpc.shutdown(on_idle?:function)` stops all clients and confirms actual exits; existing `rpc.is_idle()` remains transport-only.
- Keep `view.new(root,title,help,status,stream,submit)`; profile-aware owners supply unique buffer names/status and refresh ingress bindings when reactivated. Every submission returns false when ingress is blocked, preserving its draft.

- [ ] Add `ai_profiles.lua` `all_root_busy_matrix`: for chat/comments/help in a hidden second root, switching refuses active, queued, starting, resetting, stopping, retry/compaction, post-`agent_end` pre-settled, pending prompt-acceptance and deferred-delivery states; unchanged current profile/generation is asserted. Include unresolved conflict, an open review even after application/discard, and a pending conflict picker.
- [ ] Add `switch_preparation_failure_is_non_destructive`, `switch_waits_for_all_exits`, `timeout_and_current_name_recovery`, `saves_during_switch_need_resave`, `profile_draft_and_history_restoration`, `retired_callback_matrix`. Hold/release fake exits and callbacks deterministically; assert ingress remains blocked after timeout and actual late exit until explicit recovery, done fires once, every idle selection worker exits, target starts lazily, and no queue/marker auto-transfer occurs.
- [ ] Pin stale-response/event/exit/reset/dispatch/delivery/review/picker behavior in the owning workflow tests: old `p.sessions[key]`/`c.session`/worker slot must not clear or restart a replacement; stale apply must not edit a buffer or log to another profile. Switch A→B→A and prove drafts/overrides/history restore but retired callback closures do not regain validity. Run `bash tests/run_ai.sh ai_profiles`; expect new transition assertions FAIL.
- [ ] Implement the single coordinator: idle scan and target preparation, ingress lock, retire generation, hide views, shutdown every client, publish only after confirmed exits, and explicit timeout recovery. Preserve stdin shutdown plus SIGTERM deadline; transport cleanup always executes even for retired clients. A late exit after timeout never publishes the abandoned target automatically.
- [ ] Implement profile/root view caches and identity-keyed sessions/workers, all-root busy introspection and token-plus-slot guards. Track acceptance/settlement and review/deferred delivery explicitly, not just visible buffers or `isStreaming`. Preserve draft buffers on hide; on reactivation replace submit bindings with current-generation closures. Scope comments refresh/log and help jobs/review to their owning profile.
- [ ] Register `AIProfile` completion/picker and guarded command/autocmd ingress in `init.lua`; show profile/role/provider/ID/thinking/transition without credential data. Guard picker callbacks against profile/generation changes. Run `bash tests/run_ai.sh ai_profiles ai_view ai_new`; require the transition/UI/reset assertions PASS.

## Task 4: Role routes and minimal retained-marker replay protection

**Files:** Modify `lua/ai/{config,help,chat}.lua`, `lua/ai/profiles.lua`, `lua/ai/comments/{init,storage}.lua`, `tests/{ai_comments,ai_help,ai_new,ai_profiles}.lua`, `tests/run_ai.sh`; create `tests/ai_comments_storage.lua`.

**Interfaces:** All routes call `config.model(profile,role)`. `help.roles()->string[]` returns `{'chat','cheap','expensive'}`; keep `help.model(opts)` command handler. `profiles.help_roles()->{role:string,bang_role:string}` returns current profile's memory-only override state initialized from setup help defaults. `storage.load(root)->table<string,true>` returns the **same live table** for a canonical root; retain `storage.remember(project,key)`.

- [ ] Update `ai_comments.lua`/`ai_help.lua`/`ai_new.lua` route assertions: single edit/question and ordinary help→cheap/high, doubled markers/help bang/leading `!`→expensive/medium, web chat→chat/high, manual prompt→cheap/edit. `AINew` resets only configured manual edit-role history (cheap by default), shared with cheap edit markers; `AIChatNew` only chat. `AIHelpModel[!] chat|cheap|expensive` changes only that profile's override; unknown/old tier names fail unchanged; switching back restores overrides and a fresh setup restarts at defaults.
- [ ] Add `ai_comments_storage.lua` `load_is_shared_live_root_table`, `root_tables_are_distinct`, `existing_file_format_and_limit_retained`; verify manual keys are not persisted and >1,000 entries still skip persistence. Add `ai_profiles.lua` `cached_B_cannot_replay_A_retained_marker`: cache B first, A handles a marker whose cleanup is withheld by existing buffer/disk safeguards, switch A→B→A and resave each time; assert exactly one fake prompt and no second-profile enqueue despite B's older `seen` snapshot.
- [ ] Run `bash tests/run_ai.sh ai_comments ai_help ai_new ai_comments_storage ai_profiles`; expect new routing/replay assertions FAIL before changes.
- [ ] Replace tier-dependent routes/options/completion and help override mutation with role lookup and profile memory; manual conversation stays edit-capable. Memoize handled state per canonical root and consult it before **every** saved-marker enqueue in addition to local `seen`. Keep file format/fingerprints/capacity and existing I/O/corrupt-load behavior; no locking or persistence redesign.
- [ ] Run `bash tests/run_ai.sh` as the **first full Tasks 1–4 compatibility gate**. Require every old and new group PASS, independent resume/reset, no profile replay and no leftover fixtures. Repair any unmigrated setup/interface/fake assertions in their owning files before proceeding; do not ship an intermediate migration.

## Task 5: Final installed gate, usage docs and review

**Files:** Modify `tests/ai_pi_probe.py`, `tests/fixtures/ai_pi_probe.ts`, `plugin/ai.lua` only if the confirmed local path needs correction, `docs/ai.md`, `lua/ai/AI_COMMENTS.md`. Local setup was migrated in Task 1, not deferred to this task.

**Interfaces:** Retain Task 0 probe CLI. For final validation the harness obtains argv from `session.args` through headless Neovim with disposable fixture setup, not an independently maintained policy copy; fixture-only `--offline` and probe extension are appended explicitly. Check production capability command after startup/new/resume for chat/selection.

- [ ] Wire the installed probe to actual plugin-generated argv and rerun Task 0's lifecycle, fresh-profile local package, missing entry/dependency and negative-control matrix. Require exact active tools and empty automatic instruction/resource inputs after replacement/resume; verify both explicit extensions and their host-mapped dependencies actually load. Do not run search, fetch, model prompts, credential commands, login, install or live tests. Loading success does not prove LEGO native-search support.
- [ ] Rewrite `docs/ai.md` setup/module/permissions/persistence examples and `lua/ai/AI_COMMENTS.md` usage to the required profiles/role API. Remove stale tier names, edit-inherits-terminal-resources and legacy-history-restoration claims; fix the usage-guide link to the actual guide. Document ordinary profile authentication only where shared model sources/environment do not suffice, local pinned-package provisioning/cache-path fragility, `PI_WEB_SEARCH_CONFIG`/profile web-search.json overrides and possible separate model/auth/cost, switching refusal/recovery/resave, independent histories/drafts, manual cheap edit and ledger/CLI/webfetch caveats.
- [ ] Run `bash tests/run_ai.sh`, then `python3 tests/ai_pi_probe.py --pi "$(command -v pi)" --timeout 60 --search-extension "$HOME/.pi/agent/tmp/extensions/npm/f35b2129/node_modules/pi-web-search/src/index.ts"`, then `git diff --check` and `git diff --cached --name-only`. Require suite/probe/whitespace PASS and an empty index; compare against the execution-start snapshot and preserve all preexisting changes.
- [ ] Obtain independent **Terra high** implementation review of the five Review Focus cases, extension readiness/provisioning, credential preservation and migration gates; address blockers and rerun affected tests. **Sol high** collects verified results. This planning run performs no review/model calls; after final-plan confirmation, preserve this user-mandated development routing. No staging/commits occur automatically.

## Planning self-review and actual validation

- [x] Spec coverage: setup/sharing→Task 1; CLI/prompts/auth preservation/identity→Tasks 0/2; switching/views→Task 3; routes/replay→Task 4; installed compatibility/docs/review→Task 5. No strict-isolation requirements were carried forward.
- [x] Step scan: named source tests, assertions, commands and expected red/green results are specified; Tasks 1–4 explicitly share one full integration gate. Steps are future checkboxes, not claims of completed implementation.
- [x] Type consistency: Profile/ModelDescriptor/Identity/Token, role option names, callback signatures, session identity APIs and capability event fields use one spelling across tasks.
- [x] Review Focus: each of the five failure classes has tests in its owning task. Prior P1 gate/provisioning findings and P2 guide/search-override findings are addressed; installed compatibility and independent implementation review remain gates.
- [x] Proportion: one design and one focused implementation plan; interfaces/assertions, not a transcript of implementations. No speculative SDK, credential sandbox or storage-hardening work.

**Actually performed during planning:** current source/test/installed-document/embedded-source inspection; structural model/package metadata inspection without credentials; `bash tests/run_ai.sh` PASS (nine existing groups); `git diff --check` PASS; empty index and baseline preservation checked. **Not performed:** profile implementation, added/modified tests, installed-Pi probe, credential evaluation, authentication/model/search validation, independent implementation review, paid calls, subagents, staging or commits. The existing offline suite does not validate the future profile design.

After user confirmation, follow the prescribed routing and gates. Until then, this plan and its design are documentation only.
