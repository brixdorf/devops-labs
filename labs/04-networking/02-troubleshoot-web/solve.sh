#!/bin/bash
set -uo pipefail
out=/home/user/diagnosis.txt
: > "$out"
for s in storefront payments inventory shipping; do
  if ! ping -c 2 -W 2 "$s" >/dev/null 2>&1; then
    state=unreachable
  else
    code=$(curl -s -o /dev/null --max-time 5 -w '%{http_code}' "http://$s:8080/")
    if [ "$code" = 000 ]; then state=closed-port
    elif [ "$code" -ge 400 ]; then state=http-error; echo "http_error_code=$code" >> "$out"
    else state=ok
    fi
  fi
  echo "$s=$state" >> "$out"
done
port=$(echo "$SUDO_PASSWORD" | sudo -S -p '' ss -tlnpH | awk '/python3/ {n=split($4,a,":"); print a[n]; exit}')
echo "local_port=$port" >> "$out"
