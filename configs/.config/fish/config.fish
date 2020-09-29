eval (starship init fish)
status --is-interactive; and source (rbenv init -|psub)

set MSBuildSDKsPath /usr/local/share/dotnet/sdk/(dotnet --version)/Sdks

set -gx PATH ~/.cargo/bin $PATH
set -gx PATH /Applications/Emacs.app/Contents/MacOS $PATH
set -gx EDITOR nvim
set -gx VISUAL nvim

source ~/.config/fish/nnn_completion.fish
source ~/.config/fish/alacritty_completions.fish
source ~/.asdf/asdf.fish


# Meta
set -g fish_user_paths "/usr/local/sbin" $fish_user_paths
