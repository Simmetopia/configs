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

# Non-interactive shells use shims; interactive mise activation prepends real bins.
fish_add_path --global --move ~/.local/share/mise/shims

set -gx ERL_AFLAGS "-kernel shell_history enabled"
set -gx FLYCTL_INSTALL "$HOME/.fly"
set -gx DOTNET_ROOT "$HOME/.dotnet"

set -gx TRILIUM_NEXT_TOKEN_OP_REF "op://work/trilium-etapi-key/credential"
set -gx TRILIUM_NEXT_INBOX_NOTE_ID "VD7yNJin8PFI"

# Registers opencode's websearch tool (Exa); read from env at startup only.
# Pin the provider: the Parallel backend also sends the session id, and an
# unpinned provider is chosen by a hash of that session id.
set -gx OPENCODE_ENABLE_EXA 1
set -gx OPENCODE_WEBSEARCH_PROVIDER exa

# Legacy Linux paths can trigger macOS's /home automounter on every lookup.
if test -d /System/Library/CoreServices
    set -gx PATH (string match -v -- '/home/*' $PATH)
    # Nested shells may inherit mise's saved PATH from an older session.
    if set -q __MISE_ORIG_PATH
        set -gx __MISE_ORIG_PATH (string match -v -- '/home/*' $__MISE_ORIG_PATH)
    end
end

if status is-interactive
    mise activate fish | source
    # Activation can restore entries from an inherited mise environment diff.
    if test -d /System/Library/CoreServices
        set -gx PATH (string match -v -- '/home/*' $PATH)
    end
    # Avoid Starship's wrapper and its psub/mktemp/cat/rm subprocesses.
    starship init fish --print-full-init | source
    zoxide init fish | source
end

