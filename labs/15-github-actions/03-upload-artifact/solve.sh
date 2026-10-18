#!/bin/bash
set -euo pipefail
cd /home/user/calculator
cat >> .gitea/workflows/ci.yml <<'END'
      - name: Upload the build
        uses: actions/upload-artifact@v7
        with:
          name: calculator
          path: dist/calculator.pyz
END
git commit -qam "Upload the build as an artifact" && git push -q
sha=$(git rev-parse HEAD)
api="$GITEA_URL/api/v1/repos/$GITEA_USER/calculator/actions"
cred="$GITEA_USER:$GITEA_PASSWORD"
for _ in $(seq 1 90); do
  done=$(curl -sf -u "$cred" "$api/runs?limit=20" | python3 -c "import json,sys; d=json.load(sys.stdin); print(next((r['conclusion'] for r in d.get('workflow_runs') or [] if r['head_sha']=='$sha' and r['status']=='completed'), ''))")
  [ -n "$done" ] && break
  sleep 3
done
mkdir -p /home/user/artifact && cd /home/user/artifact
id=$(curl -sf -u "$cred" "$api/artifacts" | python3 -c "import json,sys; print(next(a['id'] for a in json.load(sys.stdin)['artifacts'] if a['name']=='calculator'))")
curl -sf -L -u "$cred" -o calculator.zip "$api/artifacts/$id/zip"
unzip -oq calculator.zip
python3 calculator.pyz 6 x 7 > result.txt
