#!/bin/bash
set -euo pipefail
in=/home/user/incoming
rm -rf "$in" /home/user/project
mkdir -p "$in/archive/2025" "$in/scratch"
cat > "$in/app.py" <<'END'
from http.server import BaseHTTPRequestHandler, HTTPServer


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"ok")


HTTPServer(("0.0.0.0", 8000), Handler).serve_forever()
END
printf 'port=8000\nlog_level=info\n' > "$in/settings.conf"
printf 'Project notes. Keep this file.\n' > "$in/README.txt"
# The log that mentions "disk full" is chosen at random.
logs=(server.log access.log archive/2025/jan.log archive/2025/feb.log scratch/debug.log)
target=${logs[$((RANDOM % ${#logs[@]}))]}
for log in "${logs[@]}"; do
  {
    echo "2026-01-10 10:00:00 INFO service started"
    echo "2026-01-10 10:05:00 INFO request handled"
    if [ "$log" = "$target" ]; then echo "2026-01-10 10:07:00 ERROR write failed: disk full"; fi
  } > "$in/$log"
done
printf 'cache\n' > "$in/session.tmp"
printf 'cache\n' > "$in/archive/old.tmp"
printf 'cache\n' > "$in/scratch/build.tmp"
printf 'keep me\n' > "$in/scratch/keep.txt"
chown -R user:user "$in"
sum=$(sha256sum "$in/app.py" "$in/settings.conf" | awk '{print $1}' | paste -sd, -)
names=$(printf '%s\n' "${logs[@]}" | xargs -n1 basename | paste -sd, -)
printf '{"target": "%s", "logs": "%s", "sums": "%s"}\n' "$(basename "$target")" "$names" "$sum" > "$LAB_CONTEXT_FILE"
