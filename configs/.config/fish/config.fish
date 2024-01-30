source ~/.config/fish/aliases.fish
~/.local/share/rtx/bin/rtx activate fish | source

set -gx EDITOR nvim
set -gx VISUAL nvim

starship init fish | source

source ~/.config/fish/nnn_completion.fish
source ~/.config/fish/alacritty_completions.fish

# Meta
set -g fish_user_paths "/usr/local/sbin" $fish_user_paths
set -g fish_user_paths "$HOME/.local/share/bob/nvim-bin" $fish_user_paths
set -g fish_user_paths "$HOME/.config/composer/vendor/bin/" $fish_user_paths
set -g fish_user_paths "$HOME/.dotnet/tools/" $fish_user_paths
set -g fish_user_paths "$HOME/.fly/bin/" $fish_user_paths
set -g fish_user_paths "$HOME/.local/bin" $fish_user_paths
set -g ERL_AFLAGS "-kernel shell_history enabled"

set -g FLYCTL_INSTALL "$HOME/.fly"

# op completion fish | source

# opam configuration
source /home/simmetopia/.opam/opam-init/init.fish > /dev/null 2> /dev/null; or true

