#!/bin/bash
set -euo pipefail
dir=/home/user/task_8
mkdir -p "$dir/confidential"
echo "2026-01-01T00:00:00Z login user=admin result=success" > "$dir/audit.log"
echo "quarterly revenue figures" > "$dir/confidential/file1"
echo "customer contract draft" > "$dir/confidential/file2"
chown -R root:root "$dir"
chown user:user /home/user/task_8
chmod 755 "$dir" "$dir/confidential"
chmod 644 "$dir/audit.log" "$dir/confidential/file1" "$dir/confidential/file2"
sum=$(cat "$dir/audit.log" "$dir/confidential/file1" "$dir/confidential/file2" | sha256sum | cut -d' ' -f1)
inodes=$(stat -c %i "$dir/audit.log" "$dir/confidential/file1" "$dir/confidential/file2" | paste -sd, -)
printf '{"sum": "%s", "inodes": "%s"}\n' "$sum" "$inodes" > "$LAB_CONTEXT_FILE"
