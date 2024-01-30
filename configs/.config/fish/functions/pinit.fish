# Defined in /tmp/fish.8BqdT2/pinit.fish @ line 2
function pinit
  cd src/
  mix deps.get
  mix deps.compile
  cd assets
  yarn
  cd ../assets_v2
  yarn
  cd ..
  nvim
end
