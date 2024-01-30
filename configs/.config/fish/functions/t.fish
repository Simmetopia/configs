function t -d "fasd builtin cd"
  set directory (fasd -d $argv | fzf)
  echo $directory
  cd $directory
end
