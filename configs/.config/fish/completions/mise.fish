# Only proceed if `usage` is available
if not command -v usage >/dev/null
    echo >&2
    echo "Error: usage CLI not found. This is required for completions to work in mise." >&2
    echo "See https://usage.jdx.dev for more information." >&2
    # Do not use return, just skip the rest
else
    if not set -q _usage_spec_mise_2025_5_14
        set -g _usage_spec_mise_2025_5_14 (mise usage | string collect)
    end

    set -l tokens

    if commandline -x >/dev/null 2>&1
        complete -xc mise -a '(usage complete-word --shell fish -s "$_usage_spec_mise_2025_5_14" -- (commandline -xpc) (commandline -t))'
    else
        complete -xc mise -a '(usage complete-word --shell fish -s "$_usage_spec_mise_2025_5_14" -- (commandline -opc) (commandline -t))'
    end
end
