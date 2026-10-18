#!/bin/bash
# Creates the greeter repository on Gitea and clones it for the user.
set -euo pipefail
auth="Authorization: Basic $(printf '%s:%s' "$GITEA_USER" "$GITEA_PASSWORD" | base64 -w0)"
api() { curl -sf -H "$auth" -H 'Content-Type: application/json' "$@"; }
api -X DELETE "$GITEA_URL/api/v1/repos/$GITEA_USER/greeter" >/dev/null 2>&1 || true
api -X POST "$GITEA_URL/api/v1/user/repos" -d '{"name":"greeter","default_branch":"main"}' >/dev/null
rm -rf /home/user/greeter /tmp/greeter-seed
runuser -u user -- bash -s "$GITEA_URL" "$GITEA_USER" "$GITEA_PASSWORD" <<'END'
set -e
url=$1 user=$2 pass=$3
enc_pass=$(python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$pass")
host=${url#http://}
git config --global credential.helper store
printf 'http://%s:%s@%s\n' "$user" "$enc_pass" "$host" > ~/.git-credentials
chmod 600 ~/.git-credentials
git config --global user.name "Lab Student"
git config --global user.email "student@example.com"
git config --global init.defaultBranch main
git config --global pull.rebase false
mkdir -p /tmp/greeter-seed && cd /tmp/greeter-seed
git init -q -b main
cat > greeter.py <<'PY'
"""Greeting helpers."""


def greet(name):
    return f"Hello, {name}!"
PY
printf '# Greeter\n\nSmall greeting helpers.\n' > README.md
git add . && git commit -q -m "Add greet function and README"
git push -q "$url/$user/greeter.git" main
cd /home/user && git clone -q "$url/$user/greeter.git" greeter
rm -rf /tmp/greeter-seed
END
base=$(runuser -u user -- git -C /home/user/greeter rev-parse HEAD)
printf '{"base": "%s"}\n' "$base" > "$LAB_CONTEXT_FILE"
