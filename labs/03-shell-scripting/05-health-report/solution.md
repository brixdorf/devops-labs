```bash
cat > /home/user/scripts/health.sh <<'END'
#!/bin/bash
# Reports uptime, memory and disk usage and sets an exit status.

THRESHOLD=${1:-80}
PATHS_TO_CHECK="/ /var /tmp"
STATUS=OK

if ! [[ $THRESHOLD =~ ^[0-9]+$ ]] || [ "$THRESHOLD" -lt 1 ] || [ "$THRESHOLD" -gt 100 ]; then
  echo "Error: threshold must be a number between 1 and 100" >&2
  exit 2
fi

show_uptime() {
  echo "Uptime: $(uptime -p)"
}

check_memory() {
  local used
  used=$(free | awk '/^Mem:/ {print int(($2 - $7) * 100 / $2)}')
  echo "Memory: ${used}% used"
  if [ "$used" -ge "$THRESHOLD" ]; then STATUS=WARNING; fi
}

check_disk() {
  local path used
  for path in $PATHS_TO_CHECK; do
    used=$(df --output=pcent "$path" | tail -n 1 | tr -dc '0-9')
    echo "Disk $path: ${used}% used"
    if [ "$used" -ge "$THRESHOLD" ]; then STATUS=WARNING; fi
  done
}

echo "System Health Report"
show_uptime
check_memory
check_disk
echo "Status: $STATUS"
if [ "$STATUS" = WARNING ]; then exit 1; fi
exit 0
END
chmod +x /home/user/scripts/health.sh
bash /home/user/scripts/health.sh; echo "exit: $?"
```
