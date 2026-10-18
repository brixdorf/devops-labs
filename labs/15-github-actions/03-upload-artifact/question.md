## Objective

The output of a build should be kept and downloadable, so testers and deployment jobs use exactly what CI built. Workflows do that with **artifacts**. You will extend the workflow to upload the built application as an artifact, download it from the run, and run it.

- Gitea: {{GITEA_URL}}, username `{{GITEA_USER}}`, password `{{GITEA_PASSWORD}}`
- The repository `{{GITEA_USER}}/calculator` is cloned to `/home/user/calculator` (credentials saved).
- Its workflow `.gitea/workflows/ci.yml` already installs, tests and builds `dist/calculator.pyz`.

## Tasks

### Task 1: Upload the artifact

Add a final step to the `build` job that uses `actions/upload-artifact@v7` to upload:

- artifact name: `calculator`
- path: `dist/calculator.pyz`

Commit and push, and wait for the run to succeed. The run page in Gitea then lists the artifact.

### Task 2: Download it

Download the `calculator` artifact from the run (the artifact link on the run page downloads a zip file) and save it as `/home/user/artifact/calculator.zip`.

The browser saves downloads on your own computer, not in the lab. Downloading inside the lab is easier through the Gitea API, which needs the artifact's ID:

```
curl -s -u {{GITEA_USER}}:'{{GITEA_PASSWORD}}' {{GITEA_URL}}/api/v1/repos/{{GITEA_USER}}/calculator/actions/artifacts
```

and then `.../actions/artifacts/<id>/zip`. Use `curl -L -o <file>` to follow the redirect and save the zip.

### Task 3: Run what CI built

Unzip it in `/home/user/artifact/`, run `python3 calculator.pyz 6 x 7`, and save the output to `/home/user/artifact/result.txt`.

## Notes

- The `artifact` folder does not exist yet.

## Expected outcome

The latest run on `main` uploaded a `calculator` artifact containing `calculator.pyz`, which you downloaded and ran.
