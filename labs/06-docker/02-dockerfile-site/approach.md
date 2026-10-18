1. `cd /home/user/site` and create the `Dockerfile` with `nano`, one instruction per line in the order FROM, WORKDIR, COPY, CMD.
2. Run `docker build -t my-site:1.0 .`
3. Run `docker run -d --name site -p 8081:8000 my-site:1.0`
4. `curl http://localhost:8081` and look for the page text.
