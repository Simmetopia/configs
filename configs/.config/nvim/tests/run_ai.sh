#!/usr/bin/env bash
# Offline tests; run from the plugin root. Does not call a real provider.
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$PWD/tests/bin:$PATH"
export AI_TEST_LOG
AI_TEST_LOG="$(mktemp /tmp/nvim-ai-tests.XXXXXX)"
test_state="$(mktemp -d /tmp/nvim-ai-state.XXXXXX)"
export XDG_STATE_HOME="$test_state/state"
export AI_TEST_HISTORY_DIR="$test_state/history"
mkdir -p "$AI_TEST_HISTORY_DIR"
trap 'rm -f "$AI_TEST_LOG"; rm -rf "$test_state"' EXIT
node tests/ai_web.mjs
nvim --headless -u NONE -l tests/ai_view.lua
nvim --headless -u NONE -l tests/ai_markdown.lua
nvim --headless -u NONE -l tests/ai_session.lua
nvim --headless -u NONE -l tests/ai_chat.lua
nvim --headless -u NONE -l tests/ai_comments.lua
nvim --headless -u NONE -l tests/ai_new.lua
