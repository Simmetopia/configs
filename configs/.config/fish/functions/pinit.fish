# Defined in /tmp/fish.8BqdT2/pinit.fish @ line 2
function pinit
  mix deps.get
  mix deps.compile
  cd apps/oceanconnect_web/assets
  npm install
  cd -
  nvim
end
