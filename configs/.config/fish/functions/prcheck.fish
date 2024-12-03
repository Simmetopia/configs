function prcheck
mix deps.get
mix format
mix compile --warnings-as-errors
mix test
end
