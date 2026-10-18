#!/bin/bash
# Installs the inventory service and breaks it in one of three ways.
set -euo pipefail
id inventory >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin inventory
install -d /opt/inventory /etc/inventory /var/empty
install -m 0644 "$LAB_DIR/files/server.py" /opt/inventory/server.py
install -m 0644 "$LAB_DIR/files/inventory.service" /etc/systemd/system/inventory.service
install -m 0644 "$LAB_DIR/files/legacy-cache.service" /etc/systemd/system/legacy-cache.service
install -d -o inventory -g inventory /var/lib/inventory
printf 'PORT=8090\nDATA_DIR=/var/lib/inventory\n' > /etc/inventory/inventory.conf

causes=(C1 C2 C3)
cause=${causes[$((RANDOM % 3))]}
case "$cause" in
  C1) sed -i 's/^PORT=.*/PORT=80x0/' /etc/inventory/inventory.conf ;;
  C2) chown root:root /var/lib/inventory && chmod 755 /var/lib/inventory ;;
  C3) systemctl daemon-reload && systemctl enable --now legacy-cache.service >/dev/null 2>&1 ;;
esac
systemctl daemon-reload
systemctl start inventory.service || true

cat > /home/user/causes.txt <<'END'
C1: The configuration file contains an invalid value.
C2: The service user cannot write to the data directory.
C3: Another process is already using the service port.
C4: The program in ExecStart does not exist.
END
chown user:user /home/user/causes.txt
rm -f /home/user/diagnosis.txt
unit_sum=$(sha256sum /etc/systemd/system/inventory.service | cut -d' ' -f1)
printf '{"cause": "%s", "unit_sum": "%s"}\n' "$cause" "$unit_sum" > "$LAB_CONTEXT_FILE"
