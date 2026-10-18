## Objective

A pipeline that publishes container images needs registry credentials. Writing them into the workflow file leaks them to everyone who can read the repository. Instead, store them as **repository secrets**: the runner injects them at run time and masks them in logs. You will build an image in CI and push it to a private registry using secrets.

- Gitea: {{GITEA_URL}}, username `{{GITEA_USER}}`, password `{{GITEA_PASSWORD}}`
- The repository `{{GITEA_USER}}/shop-web` is cloned to `/home/user/shop-web` (credentials saved). It contains `app.py` but no Dockerfile yet.
- The private container registry is `registry:5000`. Its credentials are user `{{REGISTRY_USER}}` and password `{{REGISTRY_PASSWORD}}`.

## Tasks

### Task 1: Add a Dockerfile

Create a `Dockerfile` in the repository that builds the app from `{{IMAGE_PYTHON}}`, copies `app.py` and runs it with `python3 app.py`.

### Task 2: Store the credentials as secrets

In Gitea, open the repository's **Settings**, then **Actions**, then **Secrets**, and add:

- `REGISTRY_USERNAME` with the registry user
- `REGISTRY_PASSWORD` with the registry password

### Task 3: Write the publish workflow

Create `.gitea/workflows/publish.yml` that runs on `push` and has one job named `publish` on `ubuntu-latest` that:

1. checks out the repository with `actions/checkout@v7`
2. logs in to `registry:5000` with `docker login`, reading the user and password from the two secrets (pass the password with `--password-stdin`)
3. builds the image `registry:5000/shop/web:${{ github.sha }}`
4. pushes that image

The workflow must not contain the registry user name or password.

### Task 4: Run it

Commit and push. Wait until the run succeeds, then check that the registry has the image tagged with the commit ID.

## Notes

- `registry:5000` uses plain HTTP; the runner's Docker engine is already configured to trust it, because it is a local lab registry.
- Secrets are not shown again after you save them, and they appear as `***` in run logs.

## Expected outcome

The repository has two secrets, the workflow uses them instead of hard-coded credentials, and the latest run pushed `shop/web` tagged with the latest commit ID.
