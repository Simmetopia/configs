function prcheck
cd src
mix deps.get
mix format
mix test
end
