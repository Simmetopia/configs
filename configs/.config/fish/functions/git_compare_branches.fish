function git_compare_branches --description 'Compare two git branches with colored output'
    set branch1 $argv[1]
    set branch2 $argv[2]
    
    # Define ANSI color codes
    set color_reset (printf '\033[0m')
    set color_red (printf '\033[31m')
    set color_green (printf '\033[32m')
    set color_yellow (printf '\033[33m')

    set line_counts (git diff --shortstat $branch1..$branch2 | sed -E "s/([0-9]+) files? changed, ([0-9]+) insertions?\(\+\), ([0-9]+) deletions?\(-\)/Files changed: \1, Lines added: $color_green\2$color_reset, Lines removed: $color_red\3$color_reset/")

    echo "Comparing branches: $color_yellow$branch1$color_reset..$color_yellow$branch2$color_reset"
    echo $line_counts
end

