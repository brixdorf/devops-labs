1. Start the container with `docker run`, using `-d`, `--name web` and `-p 8080:80`.
2. Check it with `docker ps`.
3. Run `curl http://localhost:8080` and look for "Welcome to nginx!".
4. Run `docker logs web` to see the access log line for your request, then save it with `docker logs web > /home/user/web-logs.txt`.
