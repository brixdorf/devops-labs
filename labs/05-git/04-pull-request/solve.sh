#!/bin/bash
set -euo pipefail
cd /home/user/greeter
git switch -q -c feature/farewell
printf '\n\ndef farewell(name):\n    return f"Goodbye, {name}!"\n' >> greeter.py
git add greeter.py
git commit -q -m "Add farewell function"
git push -q -u origin feature/farewell
auth="Authorization: Basic $(printf '%s:%s' "$GITEA_USER" "$GITEA_PASSWORD" | base64 -w0)"
api() { curl -sf -H "$auth" -H 'Content-Type: application/json' "$@"; }
num=$(api -X POST "$GITEA_URL/api/v1/repos/$GITEA_USER/greeter/pulls" \
  -d '{"title":"Add farewell function","head":"feature/farewell","base":"main"}' | python3 -c 'import json,sys; print(json.load(sys.stdin)["number"])')
api "$GITEA_URL/api/v1/repos/$GITEA_USER/greeter/pulls/$num/files" >/dev/null
for _ in $(seq 1 20); do
  api -X POST "$GITEA_URL/api/v1/repos/$GITEA_USER/greeter/pulls/$num/merge" -d '{"Do":"merge"}' >/dev/null && break
  sleep 1
done
git switch -q main
git pull -q
