#!/usr/bin/env bash
# Offline project-switcher tests. Mirrors tests/run_ai.sh isolation: disposable
# XDG state + disposable zoxide DB, PATH with tests/bin so the pi/zoxide mocks
# shadow the real tools. The zoxide shim delegates to the real binary resolved
# here (before we shadow PATH), and every test also points project.setup() at an
# isolated data_dir, so the user's frecency DB is never touched.
set -euo pipefail
cd "$(dirname "$0")/.."

# Resolve the real zoxide before prepending the test shim to PATH.
_ZO_REAL_BIN="$(readlink -f "$(command -v zoxide)" || command -v zoxide)"
export _ZO_REAL_BIN
export PATH="$PWD/tests/bin:$PATH"

test_state="$(mktemp -d /tmp/nvim-project-state.XXXXXX)"
export XDG_STATE_HOME="$test_state/state"
export _ZO_DATA_DIR="$test_state/zoxide"
mkdir -p "$XDG_STATE_HOME" "$_ZO_DATA_DIR"
trap 'rm -rf "$test_state"' EXIT

nvim --headless -u NONE -l tests/project_zoxide.lua
nvim --headless -u NONE -l tests/project_git.lua
nvim --headless -u NONE -l tests/project_sessions.lua
nvim --headless -u NONE -l tests/project_switch.lua
nvim --headless -u NONE -l tests/project_ai.lua
echo "project tests passed"
