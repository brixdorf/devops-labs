```bash
cd /home/user/status-api
printf 'secrets.env\n*.log\nnotes/\n' > .dockerignore
sed -i '/^FROM /a ENV APP_ENV=production' Dockerfile
cat Dockerfile
docker build -t status-api:2.0 .
docker run --rm status-api:2.0 ls -la /app      # no secrets.env, no logs, no notes
docker run -d --name status-api -p 8082:5000 status-api:2.0
curl http://localhost:8082/
```

The statements are shuffled per session. Pick the ones that say:

- `.dockerignore`: it excludes files from the build context, so they are never sent to the builder or copied into the image.
- `ENV`: it sets an environment variable that is stored in the image and available to every container started from it.

```bash
printf 'dockerignore=S2\nenv=S5\n' > explain.txt     # use your own IDs
```
