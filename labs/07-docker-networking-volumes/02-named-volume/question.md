## Objective

A container's own file system disappears when the container is removed. Databases therefore keep their data in a **volume** that outlives the container. You will prove this: store data in PostgreSQL, throw the container away, start a new one with the same volume, and find the data still there.

## Tasks

### Task 1: Create a named volume

Create a volume named `pgdata`.

### Task 2: Run the database

Run a PostgreSQL container in the background:

- name: `db`
- image: `{{IMAGE_POSTGRES}}`
- environment variable `POSTGRES_PASSWORD=lab@123`
- the volume `pgdata` mounted at `/var/lib/postgresql`

### Task 3: Create sample data

When the database is ready, run this SQL in it as the `postgres` user:

```sql
CREATE TABLE students (id serial PRIMARY KEY, name text NOT NULL, created_at timestamptz DEFAULT now());
INSERT INTO students (name) VALUES ('Ada'), ('Linus'), ('Grace');
```

### Task 4: Remove and recreate the container

Remove the `db` container completely (not just stop it). Then start a new container named `db` with exactly the same settings as in Task 2.

### Task 5: Verify persistence

Check that the data survived, and save the number of rows to `/home/user/student-count.txt`:

```
docker exec db psql -U postgres -tAc 'SELECT count(*) FROM students' > /home/user/student-count.txt
```

## Notes

- PostgreSQL needs a few seconds to start. `docker logs db` shows "database system is ready to accept connections" when it is ready.
- Leave the new `db` container running when you submit.

## Expected outcome

A running `db` container, created after the data was inserted, that still has the three students in the `students` table, stored in the `pgdata` volume.
