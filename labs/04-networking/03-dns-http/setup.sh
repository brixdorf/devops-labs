#!/bin/bash
# Points the machine at the lab DNS server.
set -euo pipefail
dns=$(getent hosts dns | awk '{print $1; exit}')
printf 'nameserver %s\nsearch devops.lab\noptions timeout:2 attempts:2\n' "$dns" > /etc/resolv.conf
for _ in $(seq 1 30); do dig +short @"$dns" shop.devops.lab | grep -q . && break; sleep 0.5; done
rm -f /home/user/dns-report.txt
printf '{"dns": "%s"}\n' "$dns" > "$LAB_CONTEXT_FILE"
