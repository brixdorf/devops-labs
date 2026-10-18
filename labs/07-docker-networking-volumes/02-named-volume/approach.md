1. Create the volume, then start `db` with `docker run -d`, the password variable and `-v pgdata:/var/lib/postgresql`.
2. Wait for the "ready to accept connections" log line.
3. Run the SQL with `docker exec -it db psql -U postgres` (paste both statements) and check with `SELECT * FROM students;`.
4. Remove the container with `docker rm -f db` and run the same `docker run` command again.
5. Wait until it is ready, then run the count query and save it to the file.
