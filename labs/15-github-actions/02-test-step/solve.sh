#!/bin/bash
set -euo pipefail
cd /home/user/calculator
wait_run() {
  # Waits until the run for the current commit has finished.
  local sha auth
  sha=$(git rev-parse HEAD)
  auth="Authorization: Basic $(printf '%s:%s' "$GITEA_USER" "$GITEA_PASSWORD" | base64 -w0)"
  for _ in $(seq 1 90); do
    curl -sf -H "$auth" "$GITEA_URL/api/v1/repos/$GITEA_USER/calculator/actions/runs?limit=20" \
      | python3 -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if any(r['head_sha']=='$sha' and r['status']=='completed' for r in d.get('workflow_runs') or []) else 1)" && return 0
    sleep 3
  done
  return 1
}
python3 - <<'PY'
p = ".gitea/workflows/ci.yml"
s = open(p).read()
s = s.replace("      - name: Build\n", "      - name: Run tests\n        run: make test\n      - name: Build\n")
open(p, "w").write(s)
PY
git commit -qam "Run the tests in CI" && git push -q
wait_run
printf '\n\ndef test_multiply():\n    assert calc.multiply(3, 4) == 13\n' >> tests/test_calc.py
git commit -qam "Add a multiply test" && git push -q
wait_run
sed -i 's/== 13/== 12/' tests/test_calc.py
git commit -qam "Fix the expected multiply result" && git push -q
wait_run
