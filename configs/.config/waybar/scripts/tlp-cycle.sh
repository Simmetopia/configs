#!/usr/bin/env bash
set -euo pipefail

STATE="${HOME}/.local/state/tlp-profile/current"
CURRENT="none"
[[ -f "$STATE" ]] && CURRENT="$(cat "$STATE")"

case "$CURRENT" in
  full) NEXT="quiet" ;;
  quiet) NEXT="battery" ;;
  battery|*) NEXT="full" ;;
esac

"${HOME}/.config/waybar/scripts/tlp-profile" "$NEXT"

