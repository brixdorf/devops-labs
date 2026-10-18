## Objective

This machine has its own Docker engine. Your first job is to run a web server in a container, publish it on a port of the machine, check that it answers, and read the container's logs.

## Tasks

### Task 1: Run the container

Run an Nginx container in the background with these settings:

- container name: `web`
- image: `nginx` (the official image; any tag)
- host port `8080` mapped to container port `80`

### Task 2: Verify access

Use `curl` to request `http://localhost:8080` and confirm that you get the Nginx welcome page.

### Task 3: Inspect the logs

Your request appears in the container's access log. Save the container's logs to `/home/user/web-logs.txt`.

## Notes

- Leave the `web` container running when you submit.
- The first time an image is used it is downloaded, which can take a moment.

## Expected outcome

A running container named `web` that serves the Nginx welcome page on port 8080, and a log file that shows your request.
