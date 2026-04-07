#!/usr/bin/env bash
json=$(/usr/bin/mullvad status --json 2>/dev/null)

if [ -z "$json" ]; then
  /usr/bin/jq -cn '{text: "VPN: N/A"}'
  exit 0
fi

state=$(echo "$json" | /usr/bin/jq -r '.state')

if [ "$state" = "connected" ]; then
  loc=$(echo "$json" | /usr/bin/jq -r '.details.location')
  relay=$(echo "$loc" | /usr/bin/jq -r '.hostname // "unknown"')
  city=$(echo "$loc" | /usr/bin/jq -r '.city // "unknown"')
  country=$(echo "$loc" | /usr/bin/jq -r '.country // "unknown"')
  ipv4=$(echo "$loc" | /usr/bin/jq -r '.ipv4 // "N/A"')
  ipv6=$(echo "$loc" | /usr/bin/jq -r 'if .ipv6 then .ipv6 else "N/A" end')
  protocol=$(echo "$json" | /usr/bin/jq -r '.details.endpoint.protocol // "unknown"')
  tunnel=$(echo "$json" | /usr/bin/jq -r '.details.endpoint.tunnel_type // "unknown"')
  qr=$(echo "$json" | /usr/bin/jq -r '.details.endpoint.quantum_resistant')
  features=$(echo "$json" | /usr/bin/jq -r '.details.feature_indicators // [] | join(", ")')

  text="Connected - $relay"
  tooltip="Relay: $relay
City: $city, $country
IPv4: $ipv4
IPv6: $ipv6
Protocol: $protocol ($tunnel)
Quantum Resistant: $qr
Features: $features"

  if [ "${1}" = "--notify" ]; then
    notify-send "Mullvad VPN" "$(echo -e "$tooltip")"
  else
    /usr/bin/jq -cn --arg t "$text" --arg tt "$tooltip" '{text: $t, tooltip: $tt}'
  fi
else
  text="VPN: ${state^}"
  if [ "${1}" = "--notify" ]; then
    notify-send "Mullvad VPN" "$text"
  else
    /usr/bin/jq -cn --arg t "$text" '{text: $t}'
  fi
fi
