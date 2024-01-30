zinit wait"2" lucid light-mode for \
  atinit'zpcompinit; eval "$(fasd --init auto)"' Aloxaf/fzf-tab \
  atinit"zpcompinit; zpcdreplay" zdharma/fast-syntax-highlighting \
  atload"!_zsh_autosuggest_start" zsh-users/zsh-autosuggestions \

zinit wait"1" lucid light-mode for \
  MKaysen/zsh-asdf \
  blockf laggardkernel/git-ignore \


zinit wait"0" lucid svn for \
  PZT::modules/helper \
  PZT::modules/spectrum \
  PZT::modules/git \
  PZT::modules/utility \
  PZT::modules/docker \
  if'[[ "$OSTYPE" == "darwin"* ]]' PZT::modules/homebrew \

