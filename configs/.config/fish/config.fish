fish_add_path ~/.local/share/mise/shims

if status is-interactive
  mise activate fish | source
  op completion fish | source
  starship init fish | source
  /home/simmetopia/.local/share/mise/installs/zoxide/latest/zoxide init fish | source
  eval (scw autocomplete script shell=fish)
end

source ~/.config/fish/aliases.fish
source ~/.config/fish/nnn_completion.fish
source ~/.config/fish/alacritty_completions.fish

# Meta
set -gx ERL_AFLAGset -gx fish_user_paths \
    /usr/local/sbin \
    $HOME/.local/share/npm/bin \
    $HOME/.local/share/bob/nvim-bin \
    $HOME/.config/composer/vendor/bin \
    $HOME/.fly/bin \
    $HOME/.local/bin \
    $HOME/.dotnet \
    $HOME/.dotnet/tools

set -gx FLYCTL_INSTALL "$HOME/.fly"
set -gx DOTNET_ROOT "$HOME/.dotnet"
set -gx EDITOR nvim
set -gx VISUAL nvim
