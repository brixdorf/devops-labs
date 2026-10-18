#!/bin/bash
set -euo pipefail
cd /home/user/stack
cat > compose.yaml <<END
services:
  web:
    build: ./app
    ports:
      - "8083:8000"
    environment:
      REDIS_HOST: redis
    depends_on:
      - redis
  redis:
    image: $IMAGE_REDIS
    volumes:
      - redis-data:/data

volumes:
  redis-data:
END
docker compose up -d --build --quiet-pull >/dev/null 2>&1
for _ in $(seq 1 30); do curl -sf http://localhost:8083 >/dev/null && break; sleep 1; done
curl -s http://localhost:8083 >> visits.txt
curl -s http://localhost:8083 >> visits.txt
docker compose logs web > web-logs.txt
docker compose down >/dev/null 2>&1
