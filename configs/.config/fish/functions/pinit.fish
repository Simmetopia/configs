# Defined in /tmp/fish.8BqdT2/pinit.fish @ line 2
function pinit
  mix deps.get
  mix deps.compile
  cd assets
  yarn
  cd ..
  nvim
end
