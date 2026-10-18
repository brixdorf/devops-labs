#!/bin/bash
set -euo pipefail
s() { echo "$SUDO_PASSWORD" | sudo -S -p '' "$@"; }
systemctl status inventory --no-pager >/dev/null 2>&1 || true
log=$(s journalctl -u inventory --no-pager -n 50)
if grep -q "invalid PORT" <<<"$log"; then
  cause=C1; s sed -i 's/^PORT=.*/PORT=8090/' /etc/inventory/inventory.conf
elif grep -q "cannot write" <<<"$log"; then
  cause=C2; s chown -R inventory:inventory /var/lib/inventory
else
  cause=C3; s systemctl disable --now legacy-cache
fi
s systemctl restart inventory
s systemctl enable inventory
for _ in $(seq 1 20); do curl -sf http://localhost:8090/health && break; sleep 1; done
printf 'status_command=systemctl status inventory\nlogs_command=journalctl -u inventory\nroot_cause=%s\n' "$cause" > /home/user/diagnosis.txt
