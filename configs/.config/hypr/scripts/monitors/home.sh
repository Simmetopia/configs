#!/bin/bash
# Disable laptop screen
hyprctl keyword monitor "eDP-1,disable"

# DP-3: main screen, 1440p @ 165Hz, at position 0x0
hyprctl keyword monitor "DP-3,highr,0x0,1"
hyprctl keyword monitor "HDMI-A-3,preferred,2560x0,1"

# Optional: Add a secondary display (e.g. HDMI-A-3)

# Move workspace 1 to DP-3 and focus it
hyprctl dispatch moveworkspacetomonitor 1 DP-3
hyprctl dispatch focusmonitor DP-3

