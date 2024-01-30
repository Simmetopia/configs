#!/bin/bash

# Set your variables
CONFIG_DIR="$HOME/configs"
PUSH_INTERVAL=600 # 10 minutes in seconds

# Function to push changes to the Git repo
push_changes() {
  cd "$CONFIG_DIR"
  git add .
  git commit -m "Automated commit: $(date)"
  git fetch
  git rebase origin/master
  git push 
}

# Main loop
while true; do
  # Monitor the folder for changes and push changes every 10 minutes
  inotifywait -r --exclude '/\.git/' -e modify,create,delete,moved_to,moved_from --timeout "$PUSH_INTERVAL" "$CONFIG_DIR"
  push_changes
done

