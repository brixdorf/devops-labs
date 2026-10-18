## Objective

Security checks belong in the pipeline, where they run on every change and stop problems before anything is built or shipped. You will add three kinds of scanning to a pipeline and make them a **required gate**: if any scan fails, the later stage does not run.

- **SAST** (static application security testing) with **Bandit**, which finds risky code patterns in Python
- **dependency scanning** with **Trivy**, which finds known vulnerabilities in the packages listed in `requirements.txt`
- **secret scanning** with **Gitleaks**, which finds credentials committed to the code

All three tools are installed on the runner.

- Gitea: {{GITEA_URL}}, username `{{GITEA_USER}}`, password `{{GITEA_PASSWORD}}`
- The repository `{{GITEA_USER}}/payments-api` is cloned to `/home/user/payments-api` (credentials saved). Its code has problems that all three scanners will find.

## Tasks

### Task 1: Write the pipeline

Create `.gitea/workflows/security.yml`, triggered on `push`, with two jobs on `ubuntu-latest`:

- `security`: checks out the code and runs, as separate steps:
  - `bandit -r app -lll` (fails on high-severity findings)
  - `trivy fs --scanners vuln --severity HIGH,CRITICAL --exit-code 1 .`
  - `gitleaks dir . --no-banner`
- `build`: checks out the code and runs `make build`. It must only run when `security` succeeds (`needs: security`).

### Task 2: See the gate block the build

Commit and push the workflow **without** fixing the code. The `security` job must fail and the `build` job must be skipped.

### Task 3: Fix the findings

Fix the code so all three scanners pass:

- in `app/app.py`, run `ping` without a shell: pass the command as a list, for example `subprocess.call(["ping", "-c", "1", host])`
- in `app/config.py`, remove the hard-coded secret and read it from the environment variable `AWS_SECRET_ACCESS_KEY` with `os.environ.get(...)`
- in `requirements.txt`, upgrade Django to the patched version `{{PIP_DJANGO}}`

Commit and push. The new run must pass both jobs.

## Notes

- The scanners run on the runner, not in your terminal. Their output in the run log names the file and line of every finding.
- Do not weaken the scans (no skips, ignore files or lower thresholds): fix the code.

## Expected outcome

The pipeline gates `build` on the three scans, one run shows the gate stopping the build, and the latest run passes after the fixes.
