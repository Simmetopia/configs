#!/usr/bin/env zsh

# Basic Variables
export EDITOR="nvim -e"
export MANPAGER="sh -c \"col -bx | bat -l man --style grid\""
export PAGER="less"
export VISUAL="nvim"

# FZF Variables
declare -gA ZSH_FZF

ZSH_FZF[FIND_DIR_COMMAND]="fd . -L -t d -H"
ZSH_FZF[FIND_FILE_COMMAND]="fd . -L -t f -H"
ZSH_FZF[PREVIEW_CMD]="bat"
ZSH_FZF[PREVIEW_CMD_OPTS]="--color=always"

# NNN Variables
export NNN_COLORS="2456"


