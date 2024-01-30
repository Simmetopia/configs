function md
	git fetch -a
git stash
git merge origin/develop
git stash pop
end
