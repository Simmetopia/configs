function regen-shell-cache
    mise activate fish > ~/.config/fish/conf.d/mise.fish
    op completion fish > ~/.config/fish/conf.d/op.fish
    starship init fish > ~/.config/fish/conf.d/starship.fish
    ~/.local/share/mise/installs/zoxide/latest/zoxide init fish > ~/.config/fish/conf.d/zoxide.fish
    scw autocomplete script shell=fish > ~/.config/fish/conf.d/scw.fish
    echo "Shell cache regenerated! 🎉"
end
