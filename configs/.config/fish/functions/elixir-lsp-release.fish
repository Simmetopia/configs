function elixir-lsp-release
  
  # Clone elixir ls repo
  git clone git@github.com:elixir-lsp/elixir-ls.git ~/tmp/elixir-ls
  cd ~/tmp/elixir-ls


  # Install dependencies and compile
  mix deps.get
  MIX_ENV=prod mix compile

  # Build release
  mkdir ~/tmp/elixir-lsp-release
  MIX_ENV=prod mix elixir_ls.release2 -o ../elixir-lsp-release

  # remove elixir ls repo
  rm -rf ~/tmp/elixir-ls
end
