# if "usage" is not installed show an error
if ! set -q _usage_spec_mise_2025_3_2
  set -g _usage_spec_mise_2025_3_2 (mise usage | string collect)
end
set -l tokens
if commandline -x >/dev/null 2>&1
    complete -xc mise -a '(usage complete-word --shell fish -s "$_usage_spec_mise_2025_3_2" -- (commandline -xpc) (commandline -t))'
else
    complete -xc mise -a '(usage complete-word --shell fish -s "$_usage_spec_mise_2025_3_2" -- (commandline -opc) (commandline -t))'
end
