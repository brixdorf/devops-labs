```bash
cd /home/user/stack
cat > compose.yaml <<'END'
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
    image: {{IMAGE_REDIS}}
    volumes:
      - redis-data:/data

volumes:
  redis-data:
END
docker compose up -d --build
curl -s http://localhost:8083 >> visits.txt
curl -s http://localhost:8083 >> visits.txt
cat visits.txt                 # Visit number 1, then Visit number 2
docker compose logs web > web-logs.txt
docker compose down
```
