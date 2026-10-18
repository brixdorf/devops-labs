#!/bin/bash
set -euo pipefail
cd /home/user/inventory-api
wait_run() {
  local sha
  sha=$(git rev-parse HEAD)
  for _ in $(seq 1 150); do
    curl -sf -u "$GITEA_USER:$GITEA_PASSWORD" "$GITEA_URL/api/v1/repos/$GITEA_USER/inventory-api/actions/runs?limit=20" \
      | python3 -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if any(r['head_sha']=='$sha' and r['status']=='completed' for r in d.get('workflow_runs') or []) else 1)" && return 0
    sleep 3
  done
  return 1
}
mkdir -p .gitea/workflows
cat > .gitea/workflows/release.yml <<'END'
name: Release
on: push

jobs:
  build-and-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - name: Provide the Python packages
        run: cp -r /opt/wheels wheels
      - name: Build the image
        run: docker build -t registry:5000/inventory/api:${{ github.sha }} .
      - name: Scan the image
        run: trivy image --severity CRITICAL --pkg-types library --ignore-unfixed --exit-code 1 registry:5000/inventory/api:${{ github.sha }}

  deploy:
    runs-on: ubuntu-latest
    needs: build-and-scan
    steps:
      - name: Log in to the registry
        run: echo "${{ secrets.REGISTRY_PASSWORD }}" | docker login registry:5000 -u "${{ secrets.REGISTRY_USERNAME }}" --password-stdin
      - name: Push the release
        run: |
          docker tag registry:5000/inventory/api:${{ github.sha }} registry:5000/inventory/api:prod
          docker push registry:5000/inventory/api:${{ github.sha }}
          docker push registry:5000/inventory/api:prod
END
git add .gitea && git commit -qm "Add release pipeline with image scan" && git push -q
wait_run
printf '%s\n' "$PIP_DJANGO" > requirements.txt
git commit -qam "Upgrade Django to a patched version" && git push -q
wait_run
