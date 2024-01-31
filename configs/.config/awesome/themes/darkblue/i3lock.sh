#!/bin/bash

# Path to the original image you want to display on each screen
original_image="./wallpapers/itm-blue.png"

# Temporary image file that will be created to fit all monitors
temp_image="/tmp/i3lock_temp.png"

# Initial command to start with a blank canvas
cmd="convert -size $(xrandr --current | grep '*' | awk '{print $1}' | xargs printf "%sx%s+0+0 " | sed 's/ $//') xc:black "

# Add the original image to each monitor's position
xrandr --current | grep ' connected' | while read -r line; do
    # Extracting the resolution and offset of each monitor
    resolution=$(echo $line | egrep -o '[0-9]+x[0-9]+\+[0-9]+\+[0-9]+')
    # Append the command to overlay the image at the correct position
    cmd+="-geometry $resolution -composite $original_image "
done

# Finalize the command with the output file
cmd+="$temp_image"

# Execute the command to create a single composite image
eval "$cmd"

# Lock the screen with the composite image
i3lock -i "$temp_image"

# Optionally, remove the temporary image file after locking
rm "$temp_image"
