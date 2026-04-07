#!/usr/bin/env bash

# List all sinks with descriptions, mark current default
default=$(pactl get-default-sink)

options=$(pactl -f json list sinks | jq -r '.[] | "\(.name)\t\(.description)"' | while IFS=$'\t' read -r name desc; do
    if [ "$name" = "$default" ]; then
        printf "* %s\t%s\n" "$desc" "$name"
    else
        printf "  %s\t%s\n" "$desc" "$name"
    fi
done)

selected=$(echo "$options" | wofi --dmenu --prompt "Audio Output" -i)

[ -z "$selected" ] && exit 0

sink_name=$(echo "$selected" | awk -F'\t' '{print $2}')

# Set as system default
pactl set-default-sink "$sink_name"

# Move all active streams to the new sink
pactl list short sink-inputs | awk '{print $1}' | while read -r input; do
    pactl move-sink-input "$input" "$sink_name"
done
