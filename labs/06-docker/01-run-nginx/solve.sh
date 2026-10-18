#!/bin/bash
set -euo pipefail
docker run -d --name web -p 8080:80 nginx >/dev/null
for _ in $(seq 1 30); do curl -sf http://localhost:8080 >/dev/null && break; sleep 1; done
curl -s http://localhost:8080 | grep -q "Welcome to nginx"
docker logs web > /home/user/web-logs.txt 2>&1
