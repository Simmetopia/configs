zinit pack for fzf

zinit wait lucid light-mode for \
  atinit"zicompinit; zicdreplay" \
      zdharma/fast-syntax-highlighting \
  atload"_zsh_autosuggest_start" \
      zsh-users/zsh-autosuggestions \
  blockf atpull'zinit creinstall -q .' \
      zsh-users/zsh-completions

zinit wait'!' lucid atload'source ~/.p10k.zsh; _p9k_precmd' nocd light-mode for \
  romkatv/powerlevel10k
