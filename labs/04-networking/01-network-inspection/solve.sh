#!/bin/bash
set -euo pipefail
iface=$(ip -o -4 addr show | awk '$2 != "lo" {print $2; exit}')
cidr=$(ip -o -4 addr show dev "$iface" | awk '{print $4; exit}')
gw=$(ip route | awk '/^default/ {print $3; exit}')
ports=$(ss -H -tln | awk '{n=split($4,a,":"); print a[n]}' | sort -n | uniq | paste -sd, -)
cat > /home/user/network-report.txt <<END
interface=$iface
ip_address=${cidr%/*}
prefix_length=${cidr#*/}
default_gateway=$gw
listening_ports=$ports
END
printf 'ip_command=ip addr show\nroute_command=ip route\nports_command=ss -tln\n' > /home/user/commands.txt
printf 'Q1=B\nQ2=A\nQ3=C\nQ4=B\n' > /home/user/interpretation.txt
