#!/bin/bash
# Disable laptop screen
hyprctl keyword monitor "eDP-1,preferred,0x0,1"

# DP-3: main screen, 1440p @ 165Hz, at position 0x0
hyprctl keyword monitor "DVI-I-1,preferred,1920x0,1"
hyprctl keyword monitor "DVI-I-2,preferred,4480x0,1"


