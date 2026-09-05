# Minimal mise completion — bypasses usage to avoid MAX_ARG_STRLEN overflow
complete -c mise -f

# top-level subcommands
complete -xc mise -n '__fish_use_subcommand' -a 'run install use exec ls tasks which where activate completion upgrade'

# task name completion for `mise run`
complete -xc mise -n '__fish_seen_subcommand_from run r' -a '(mise tasks ls 2>/dev/null | awk \'NR>1 {print $1}\')'

