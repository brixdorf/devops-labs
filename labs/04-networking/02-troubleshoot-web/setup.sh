#!/bin/bash
# Maps the four public names to the simulated services in a random order,
# and starts the local admin app on a random wrong port.
set -euo pipefail
ip_of() { getent hosts "$1" | awk '{print $1; exit}'; }
ok=$(ip_of svc-ok); err=$(ip_of svc-error); closed=$(ip_of svc-closed)
# An address in this network that no container uses: no ping reply.
dead=$(python3 - <<'PY'
import ipaddress, json, subprocess
info = json.loads(subprocess.run(["ip", "-j", "-4", "addr"], capture_output=True, text=True).stdout)
addr = next(a["addr_info"][0] for a in info if a["ifname"] != "lo" and a.get("addr_info"))
net = ipaddress.ip_network(f"{addr['local']}/{addr['prefixlen']}", strict=False)
print(net.broadcast_address - 7)
PY
)
names=(storefront payments inventory shipping)
mapfile -t order < <(printf '%s\n' ok unreachable closed-port http-error | shuf)
json="{"
for i in 0 1 2 3; do
  case "${order[$i]}" in
    ok) ip=$ok ;;
    unreachable) ip=$dead ;;
    closed-port) ip=$closed ;;
    http-error) ip=$err ;;
  esac
  echo "$ip ${names[$i]}" >> /etc/hosts
  json+="\"${names[$i]}\": \"${order[$i]}\", "
done
ports=(8001 8081 8888 9000 8800)
local_port=${ports[$((RANDOM % ${#ports[@]}))]}
mkdir -p /opt/admin && echo "admin console" > /opt/admin/index.html
setsid nohup python3 -m http.server "$local_port" --bind 0.0.0.0 --directory /opt/admin >/dev/null 2>&1 < /dev/null &
rm -f /home/user/diagnosis.txt
sleep 1
printf '%s "http_error_code": "503", "local_port": "%s"}\n' "$json" "$local_port" > "$LAB_CONTEXT_FILE"
