source ~/.asdf/asdf.fish
eval (starship init fish)

set -gx EDITOR nvim
set -gx VISUAL nvim

source ~/.config/fish/nnn_completion.fish
source ~/.config/fish/alacritty_completions.fish


# Meta
set -g fish_user_paths "/usr/local/sbin" $fish_user_paths
