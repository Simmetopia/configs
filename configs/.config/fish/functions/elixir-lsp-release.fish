function elixir-lsp-release
  
  # Clone elixir ls repo
  git clone https://github.com/elixir-lsp/elixir-ls.git ~/tmp/elixir-ls
  cd ~/tmp/elixir-ls
  git checkout v0.22.0


  # Install dependencies and compile
  mix deps.get
  MIX_ENV=prod mix compile

  # Build release
  MIX_ENV=prod mix elixir_ls.release2 -o ../elixir-lsp-release

  cd ~
  # remove elixir ls repo
  rm -rf ~/tmp/elixir-ls
end
