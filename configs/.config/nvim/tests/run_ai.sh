#!/usr/bin/env bash
# Offline tests; run from the plugin root. Does not call a real provider.
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$PWD/tests/bin:$PATH"
export AI_TEST_LOG
AI_TEST_LOG="$(mktemp -t nvim-ai-tests)"
test_state="$(mktemp -d -t nvim-ai-state)"
export XDG_STATE_HOME="$test_state/state"
export AI_TEST_HISTORY_DIR="$test_state/history"
mkdir -p "$AI_TEST_HISTORY_DIR"
export AI_TEST_PROFILE_DIR="$test_state/profile"
export AI_TEST_ARGV_LOG="$test_state/argv.jsonl"
export AI_TEST_HOLD_EXIT_FILE="$test_state/release-fake-pi"
export AI_TEST_ABORT_FAIL_FILE="$test_state/fail-abort-response"
export PI_CODING_AGENT_DIR="$AI_TEST_PROFILE_DIR/terminal-agent"
export AI_TEST_FAKE_CREDENTIAL='fixture-only-not-a-real-credential'
export AI_TEST_EXPECTED_PATH="$PATH"
mkdir -p "$AI_TEST_HISTORY_DIR" "$AI_TEST_PROFILE_DIR/search-package/src"
printf '{}\n' > "$AI_TEST_PROFILE_DIR/models-source.json"
cat > "$AI_TEST_PROFILE_DIR/search-package/package.json" <<'EOF'
{"name":"pi-web-search","version":"1.6.0","pi":{"extensions":["./src/index.ts"]}}
EOF
cat > "$AI_TEST_PROFILE_DIR/search-package/src/index.ts" <<'EOF'
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
export default function (_pi: ExtensionAPI) {}
EOF
trap 'rm -f "$AI_TEST_LOG"; rm -rf "$test_state"' EXIT

run_group() {
  case "$1" in
    ai_web) node tests/ai_web.mjs ;;
    ai_config|ai_profiles|ai_profiles_busy|ai_profile_callbacks|ai_view|ai_timeline|ai_tools|ai_markdown|ai_session|ai_chat|ai_comments|ai_comments_storage|ai_new|ai_help|ai_comments_live|ai_comments_live_setup)
      nvim --headless -u NONE -l "tests/$1.lua" ;;
    *) printf 'unknown AI test group: %s\n' "$1" >&2; return 2 ;;
  esac
}

if (($#)); then
  for group in "$@"; do run_group "$group"; done
else
  run_group ai_web
  run_group ai_config
  run_group ai_profiles
  run_group ai_profiles_busy
  run_group ai_profile_callbacks
  run_group ai_view
  run_group ai_timeline
  run_group ai_tools
  run_group ai_markdown
  run_group ai_session
  run_group ai_chat
  run_group ai_comments
  run_group ai_comments_storage
  run_group ai_new
  run_group ai_help
  run_group ai_comments_live_setup
fi
