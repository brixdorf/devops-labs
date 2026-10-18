#!/bin/bash
set -euo pipefail
cd /home/user/payments-api
wait_run() {
  local sha
  sha=$(git rev-parse HEAD)
  for _ in $(seq 1 120); do
    curl -sf -u "$GITEA_USER:$GITEA_PASSWORD" "$GITEA_URL/api/v1/repos/$GITEA_USER/payments-api/actions/runs?limit=20" \
      | python3 -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if any(r['head_sha']=='$sha' and r['status']=='completed' for r in d.get('workflow_runs') or []) else 1)" && return 0
    sleep 3
  done
  return 1
}
mkdir -p .gitea/workflows
cat > .gitea/workflows/security.yml <<'END'
name: Security
on: push

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - name: SAST with Bandit
        run: bandit -r app -lll
      - name: Dependency scan with Trivy
        run: trivy fs --scanners vuln --severity HIGH,CRITICAL --exit-code 1 .
      - name: Secret scan with Gitleaks
        run: gitleaks dir . --no-banner

  build:
    runs-on: ubuntu-latest
    needs: security
    steps:
      - uses: actions/checkout@v7
      - name: Build
        run: make build
END
git add .gitea && git commit -qm "Add security gate" && git push -q
wait_run
sed -i 's/subprocess.call(f"ping -c 1 {host}", shell=True)/subprocess.call(["ping", "-c", "1", host])/' app/app.py
printf 'import os\n\nsettings = {"aws_secret": os.environ.get("AWS_SECRET_ACCESS_KEY", "")}\n' > app/config.py
printf '%s\n' "$PIP_DJANGO" > requirements.txt
git commit -qam "Fix security findings" && git push -q
wait_run
