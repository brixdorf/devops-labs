#!/bin/bash
set -euo pipefail
ready() { for _ in $(seq 1 60); do docker exec db pg_isready -U postgres >/dev/null 2>&1 && return 0; sleep 1; done; return 1; }
docker volume create pgdata >/dev/null
docker run -d --name db -e POSTGRES_PASSWORD=lab@123 -v pgdata:/var/lib/postgresql "$IMAGE_POSTGRES" >/dev/null
ready
sleep 2
docker exec -i db psql -q -U postgres <<'SQL'
CREATE TABLE students (id serial PRIMARY KEY, name text NOT NULL, created_at timestamptz DEFAULT now());
INSERT INTO students (name) VALUES ('Ada'), ('Linus'), ('Grace');
SQL
docker rm -f db >/dev/null
docker run -d --name db -e POSTGRES_PASSWORD=lab@123 -v pgdata:/var/lib/postgresql "$IMAGE_POSTGRES" >/dev/null
ready
sleep 2
docker exec db psql -U postgres -tAc 'SELECT count(*) FROM students' > /home/user/student-count.txt
