#!/usr/bin/env bash

# Get monitor info in JSON
monitors_json=$(hyprctl monitors -j)

# Disable eDP-1
hyprctl dispatch dpms eDP-1 off

# Extract external monitors and find one with highest available refresh rate
best_monitor=$(echo "$monitors_json" | jq -r '
  map(select(.name != "eDP-1" and .disabled == false)) |
  map({
    name: .name,
    bestHz: (
      .availableModes | map(
        capture("(?<res>\\d+x\\d+)@(?<hz>[\\d.]+)Hz").hz | tonumber
      ) | max
    )
  }) | sort_by(-.bestHz) | .[0].name
')

if [ -z "$best_monitor" ]; then
  echo "No external monitor found."
  exit 1
fi

echo "Selected main monitor: $best_monitor"

# Set it to position 0x0 and move workspace 1 there
hyprctl dispatch moveworkspacetomonitor 1 "$best_monitor"
hyprctl dispatch focusmonitor "$best_monitor"
hyprctl keyword monitor "$best_monitor,preferred,0x0,1"

