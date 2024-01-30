# Defined in /var/folders/w_/ycrltgz55y51007psvqkwvzsjbsl2g/T//fish.0SQlvi/mox-update.fish @ line 2
function mox-update
	npm install
    cd ios/
    pod install
    bundle install
    cd ..
end
