## Scenario

The `status-api` project in `/home/user/status-api` already has a working `Dockerfile` that copies the whole project folder into the image. Two problems were found in review:

1. The image contains files that must never ship: a local secrets file, log files and personal notes.
2. The app reads the environment variable `APP_ENV` to decide whether it runs in development or production, but the image does not set it, so it always reports `development`.

Fix both, rebuild, run the new image and explain what you added.

## Tasks

### Task 1: Add a .dockerignore

Create `/home/user/status-api/.dockerignore` so that these are **not** sent to the build and do not end up in the image:

- the file `secrets.env`
- every file ending in `.log`
- the folder `notes/`

The application files (`app.py` and `Dockerfile`) must still be included.

### Task 2: Set an environment variable in the image

Add an `ENV` instruction to the Dockerfile that sets `APP_ENV` to `production`.

### Task 3: Rebuild and run

Build the image as `status-api:2.0` and run it in the background:

- container name: `status-api`
- host port `8082` mapped to container port `5000`

`curl http://localhost:8082/` must then return `{"app": "status-api", "env": "production"}`.

### Task 4: Explain the additions

`/home/user/status-api/statements.txt` lists numbered statements. Create `/home/user/status-api/explain.txt` with two lines, naming the statement that correctly explains each addition:

```
dockerignore=<statement ID>
env=<statement ID>
```

## Notes

- Do not delete `secrets.env`, the logs or the notes from the project folder: excluding them from the image is the point.
- Leave the `status-api` container running when you submit.

## Expected outcome

`status-api:2.0` contains the app but none of the excluded files, reports `production`, runs on port 8082, and `explain.txt` names the right statements.
