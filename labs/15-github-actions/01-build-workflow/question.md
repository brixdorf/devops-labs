## Objective

Continuous integration starts with one rule: every push is built automatically. In this lab, **Gitea Actions** stands in for GitHub Actions. It reads the same workflow syntax, and the familiar actions such as `actions/checkout` work. You will write a workflow that runs on every push, checks out the code, installs the dependencies and builds the application.

- Gitea: {{GITEA_URL}} (or the **Open Gitea** button above)
- Username: `{{GITEA_USER}}`, password: `{{GITEA_PASSWORD}}`

The repository `{{GITEA_USER}}/calculator` is cloned to `/home/user/calculator`, and your credentials are saved for `git push`. It contains a small Python app:

- `requirements.txt`: the dependencies (install them with `pip install -r requirements.txt`)
- `Makefile`: `make build` builds `dist/calculator.pyz`

## Tasks

### Task 1: Write the workflow

Create `.gitea/workflows/ci.yml` in the repository (Gitea also accepts `.github/workflows/`) with:

- the workflow name `CI`
- a trigger on `push`
- one job named `build` that runs on `ubuntu-latest`
- these steps, in this order:
  1. check out the repository with `actions/checkout@v7`
  2. install the dependencies from `requirements.txt` with `pip`
  3. build the application with `make build`

### Task 2: Push and watch it run

Commit the workflow, push it to `main`, and open the **Actions** tab of the repository in Gitea. Wait until the run finishes successfully.

## Notes

- The runner has Python 3 and `pip`. Python packages are installed from a local package mirror, so no internet is needed.
- If a run fails, open it, read the log of the failed step, fix the workflow, and push again.

## Expected outcome

The latest commit on `main` contains the workflow, and the push triggered a successful run of the `build` job that checked out, installed and built.
