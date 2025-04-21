eval "/usr/bin/mise activate fish | source" 

source ~/.config/fish/aliases.fish
op completion fish | source

set -gx EDITOR nvim
set -gx VISUAL nvim

starship init fish | source

source ~/.config/fish/nnn_completion.fish
source ~/.config/fish/alacritty_completions.fish

# Meta
set -g fish_user_paths "/usr/local/sbin" $fish_user_paths
set -g fish_user_paths "$HOME/.local/share/bob/nvim-bin" $fish_user_paths
set -g fish_user_paths "$HOME/.config/composer/vendor/bin/" $fish_user_paths
set -g fish_user_paths "$HOME/.fly/bin/" $fish_user_paths
set -g fish_user_paths "$HOME/.local/bin" $fish_user_paths
set -g ERL_AFLAGS "-kernel shell_history enabled"

set -g FLYCTL_INSTALL "$HOME/.fly"


set -gx DOTNET_ROOT (mise where dotnet)
set -gx DOTNET_CLI_TELEMETRY_OPTOUT 1

/home/simmetopia/.local/share/mise/installs/zoxide/latest/zoxide init fish | source

# BEGIN opam configuration
# This is useful if you're using opam as it adds:
#   - the correct directories to the PATH
#   - auto-completion for the opam binary
# This section can be safely removed at any time if needed.
test -r '/home/simmetopia/.opam/opam-init/init.fish' && source '/home/simmetopia/.opam/opam-init/init.fish' > /dev/null 2> /dev/null; or true
# END opam configuration
