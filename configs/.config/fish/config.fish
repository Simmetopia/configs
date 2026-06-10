fish_add_path ~/.local/share/mise/shims

if status is-interactive
    mise activate fish | source
    starship init fish | source
    zoxide init fish | source
end

set -gx EDITOR nvim
set -gx VISUAL nvim

set -gx fish_user_paths \
    /usr/local/sbin \
    $HOME/.local/share/npm/bin \
    $HOME/.local/share/bob/nvim-bin \
    $HOME/.config/composer/vendor/bin \
    $HOME/.fly/bin \
    $HOME/.local/bin \
    $HOME/.dotnet \
    $HOME/.dotnet/tools

set -gx ERL_AFLAGS "-kernel shell_history enabled"
set -gx FLYCTL_INSTALL "$HOME/.fly"
set -gx DOTNET_ROOT "$HOME/.dotnet"

set -gx TRILIUM_NEXT_TOKEN_OP_REF "op://work/trilium-etapi-key/credential"
set -gx TRILIUM_NEXT_INBOX_NOTE_ID "VD7yNJin8PFI"

