#! /usr/bin/sh

sudo pacman -Syuu

sudo pacman -S yay 

yay -S git base-devel kitty tmux stow starship

git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.8.1

git clone https://github.com/simmetopia/configs

cd configs
stow home_configs
stow configs

cd -

