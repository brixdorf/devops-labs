## Objective

Even clean code ships in an image full of other software. Scanning the **built image** catches vulnerable packages before they reach production. In this lab you add an image scan to a release pipeline and use it as a **gate**: the deployment step only runs when the image meets the agreed security threshold.

**Agreed threshold:** no CRITICAL vulnerabilities with an available fix in the application's libraries. With Trivy that is:

```
trivy image --severity CRITICAL --pkg-types library --ignore-unfixed --exit-code 1 <image>
```

- Gitea: {{GITEA_URL}}, username `{{GITEA_USER}}`, password `{{GITEA_PASSWORD}}`
- The repository `{{GITEA_USER}}/inventory-api` is cloned to `/home/user/inventory-api` (credentials saved). It contains `app.py` and a `Dockerfile` that installs `requirements.txt` from a folder `wheels/` (the runner provides the packages in `/opt/wheels`).
- The repository already has the secrets `REGISTRY_USERNAME` and `REGISTRY_PASSWORD` for the registry `registry:5000`.

## Tasks

### Task 1: Write the release pipeline

Create `.gitea/workflows/release.yml`, triggered on `push`, with two jobs on `ubuntu-latest`:

- `build-and-scan`:
  1. check out the code
  2. copy the runner's packages into the build context: `cp -r /opt/wheels wheels`
  3. build the image `registry:5000/inventory/api:${{ github.sha }}`
  4. scan it with the Trivy command above
- `deploy`, which needs `build-and-scan`:
  1. log in to `registry:5000` with the secrets
  2. tag the image as `registry:5000/inventory/api:prod` and push both tags

### Task 2: See the gate stop the deployment

Commit and push the workflow without other changes. The scan must fail (the app pins an old, vulnerable Django), and `deploy` must be skipped, so no `prod` tag reaches the registry.

### Task 3: Fix and release

Upgrade Django in `requirements.txt` to `{{PIP_DJANGO}}`, commit and push. This time the scan passes and `deploy` pushes the `prod` tag.

## Notes

- Both jobs run on the same runner, so the image built in the first job is available to the second.
- Do not weaken the gate (no `|| true`, lower severity or `--exit-code 0`).

## Expected outcome

One run where the scan blocked the deployment, and a latest run that scanned the fixed image and pushed it as `prod` to the registry.
