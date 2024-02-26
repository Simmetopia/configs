function gw
    git switch $argv
end

complete -c gw --wraps 'git switch'