## Objective

Real applications are several containers that work together. Docker Compose describes them in one file and starts them with one command. In this lab you write a `compose.yaml` for a small web app that counts visits in a Redis database, start the stack, check that the services talk to each other, read the logs, and shut it down.

The application is ready in `/home/user/stack/app/` (`app.py` and a `Dockerfile`). It listens on port `8000` and connects to Redis at the host name given in the environment variable `REDIS_HOST`.

## Tasks

### Task 1: Write compose.yaml

Create `/home/user/stack/compose.yaml` with two services:

**web**

- built from the `./app` folder
- host port `8083` mapped to container port `8000`
- environment variable `REDIS_HOST=redis`
- starts after `redis` (`depends_on`)

**redis**

- image `{{IMAGE_REDIS}}`
- a named volume `redis-data` mounted at `/data`

Declare the `redis-data` volume in the top-level `volumes:` section.

### Task 2: Start the stack

From `/home/user/stack`, build and start both services in the background.

### Task 3: Verify the communication

Request `http://localhost:8083` **twice** and append both responses to `/home/user/stack/visits.txt`. The visit number must go up, which proves that `web` talks to `redis`.

### Task 4: Inspect the logs

Save the logs of the `web` service to `/home/user/stack/web-logs.txt`.

### Task 5: Shut it down

Stop and remove the stack's containers and network. Keep the volume.

## Notes

- Run the Compose commands from `/home/user/stack`, so the project name is `stack`.
- The checker starts your stack once more by itself to confirm it works, then removes it again.

## Expected outcome

A working `compose.yaml`, two increasing visit responses, the web logs, and a stack that is shut down at the end.
