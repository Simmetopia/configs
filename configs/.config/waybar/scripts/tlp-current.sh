#!/usr/bin/env bash
STATE="${HOME}/.local/state/tlp-profile/current"
CAP="$(cat /sys/devices/system/cpu/intel_pstate/max_perf_pct 2>/dev/null || echo '?')"
PROF="$(cat "$STATE" 2>/dev/null || echo none)"
echo "${PROF} (${CAP}%)"

