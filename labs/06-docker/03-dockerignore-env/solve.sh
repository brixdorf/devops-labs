#!/bin/bash
set -euo pipefail
cd /home/user/status-api
printf 'secrets.env\n*.log\nnotes/\n' > .dockerignore
sed -i '/^FROM /a ENV APP_ENV=production' Dockerfile
docker build -q -t status-api:2.0 . >/dev/null
docker run -d --name status-api -p 8082:5000 status-api:2.0 >/dev/null
for _ in $(seq 1 30); do curl -sf http://localhost:8082/ >/dev/null && break; sleep 1; done
d=$(grep 'build context' statements.txt | cut -d: -f1)
e=$(grep 'available to every container' statements.txt | cut -d: -f1)
printf 'dockerignore=%s\nenv=%s\n' "$d" "$e" > explain.txt
