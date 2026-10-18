1. `cd /home/user/stack` and create `compose.yaml` with `nano`.
2. Check the file with `docker compose config`.
3. `docker compose up -d --build`, then `docker compose ps`.
4. Run the `curl` command twice with `>> visits.txt` and look at the numbers.
5. `docker compose logs web > web-logs.txt`
6. `docker compose down`, then `docker compose ps -a` shows nothing.
