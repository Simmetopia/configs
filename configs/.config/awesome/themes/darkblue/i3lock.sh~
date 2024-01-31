#!/bin/bash

# Path to the original image you want to display on each screen
original_image="./wallpapers/itm-blue.png"

# Temporary image file that will be created to fit all monitors
temp_image="/tmp/i3lock_temp.png"

# Get information about each connected and active monitor from xrandr
# and prepare an ImageMagick command to combine images for each monitor
cmd="convert -size $(xrandr | grep '*' | awk '{print $1}' | xargs -I {} echo {}+0+0 | tr '\n' ' ' | sed 's/ $//') xc:black "
xrandr | grep ' connected' | while read -r line; do
    # Extracting the resolution and offset of each monitor
    resolution=$(echo $line | egrep -o '[0-9]+x[0-9]+\+[0-9]+\+[0-9]+')
    # Append the command to place the image on each monitor
    cmd+="-page $resolution $original_image "
done

# Finalize the command with the output file
cmd+="-layers flatten $temp_image"

# Execute the command to create a single composite image
eval $cmd

# Lock the screen with the composite image
i3lock -i $temp_image

# Optionally, remove the temporary image file after locking
rm $temp_image

