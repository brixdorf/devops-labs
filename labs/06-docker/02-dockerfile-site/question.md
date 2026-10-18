## Objective

A designer handed you a single HTML page in `/home/user/site/index.html`. Package it as a container image with your own `Dockerfile`, build it, run it and check that the page is served.

## Tasks

### Task 1: Write the Dockerfile

Create `/home/user/site/Dockerfile` that uses exactly these four kinds of instructions:

- `FROM`: start from the Python image `{{IMAGE_PYTHON}}`
- `WORKDIR`: use `/srv/site` as the working directory
- `COPY`: copy `index.html` into the working directory
- `CMD`: start Python's built-in web server on port `8000`, serving the working directory, in exec (JSON array) form:

```
CMD ["python3", "-m", "http.server", "8000"]
```

### Task 2: Build the image

Build the image from `/home/user/site` and tag it `my-site:1.0`.

### Task 3: Run and verify

Run a container from `my-site:1.0` in the background:

- container name: `site`
- host port `8081` mapped to container port `8000`

Then check with `curl http://localhost:8081` that your page is returned.

## Notes

- Leave the `site` container running when you submit.
- The image tag must be exactly `my-site:1.0`.

## Expected outcome

An image `my-site:1.0` built from your Dockerfile, and a running container `site` that serves `index.html` on port 8081.
