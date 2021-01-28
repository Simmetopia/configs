source ~/.asdf/asdf.fish
source ~/.config/fish/aliases.fish

set -gx EDITOR nvim
set -gx VISUAL nvim

starship init fish | source

source ~/.config/fish/nnn_completion.fish
source ~/.config/fish/alacritty_completions.fish

# Meta
set -g fish_user_paths "/usr/local/sbin" $fish_user_paths
set -g fish_user_paths "$HOME/.config/composer/vendor/bin/" $fish_user_paths
