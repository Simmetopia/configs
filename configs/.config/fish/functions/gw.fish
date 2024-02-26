function gw --description 'git switch shorthand'
    git switch $argv
end

complete -c gw --wraps 'git switch'