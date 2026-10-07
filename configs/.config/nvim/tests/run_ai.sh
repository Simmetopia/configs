#!/usr/bin/env bash
# Offline tests; run from the plugin root. Does not call a real provider.
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$PWD/tests/bin:$PATH"
export AI_TEST_LOG
AI_TEST_LOG="$(mktemp -t nvim-ai-tests)"
trap 'rm -f "$AI_TEST_LOG"' EXIT
node tests/ai_web.mjs
nvim --headless -u NONE -l tests/ai_view.lua
nvim --headless -u NONE -l tests/ai_markdown.lua
nvim --headless -u NONE -l tests/ai_session.lua
nvim --headless -u NONE -l tests/ai_chat.lua
nvim --headless -u NONE -l tests/ai_comments.lua
