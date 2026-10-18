1. Look at the project with `ls -la` and read the `Dockerfile`.
2. Write `.dockerignore` with the three patterns.
3. Add `ENV APP_ENV=production` to the Dockerfile, after `FROM`.
4. `docker build -t status-api:2.0 .`, then check the image contents with `docker run --rm status-api:2.0 ls -la /app`.
5. Run the container on 8082 and test it with `curl`.
6. Read `statements.txt` and write `explain.txt`.
