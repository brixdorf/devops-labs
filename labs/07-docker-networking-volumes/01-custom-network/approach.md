1. Create the network with `docker network create app-net`.
2. Start `api` with `--network app-net`.
3. Start `client` with `--network app-net` and the command `sleep 3600`.
4. Run `docker exec client wget -qO- http://api` and check that it prints the Nginx page, then save it to the file.
5. Use `docker network inspect app-net` to find the subnet and api's IP address and write `network-details.txt`.
