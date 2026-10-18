```bash
docker volume create pgdata
docker run -d --name db -e POSTGRES_PASSWORD=lab@123 -v pgdata:/var/lib/postgresql {{IMAGE_POSTGRES}}
until docker exec db pg_isready -U postgres; do sleep 1; done

docker exec -i db psql -U postgres <<'SQL'
CREATE TABLE students (id serial PRIMARY KEY, name text NOT NULL, created_at timestamptz DEFAULT now());
INSERT INTO students (name) VALUES ('Ada'), ('Linus'), ('Grace');
SQL

docker rm -f db
docker run -d --name db -e POSTGRES_PASSWORD=lab@123 -v pgdata:/var/lib/postgresql {{IMAGE_POSTGRES}}
until docker exec db pg_isready -U postgres; do sleep 1; done

docker exec db psql -U postgres -tAc 'SELECT count(*) FROM students' > /home/user/student-count.txt
cat /home/user/student-count.txt     # 3
```
