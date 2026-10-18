#!/bin/bash
# Helpers for lab setup scripts that work with the local Gitea server.
# Source it with: . "$LAB_DIR/lib/gitea.sh"

gitea_auth() {
  printf 'Authorization: Basic %s' "$(printf '%s:%s' "$GITEA_USER" "$GITEA_PASSWORD" | base64 -w0)"
}

gitea_api() {
  curl -sf -H "$(gitea_auth)" -H 'Content-Type: application/json' "$@"
}

# Saves the Gitea credentials and a Git identity for the lab user.
gitea_user_git_setup() {
  runuser -u user -- bash -s "$GITEA_URL" "$GITEA_USER" "$GITEA_PASSWORD" <<'END'
set -e
enc=$(python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$3")
git config --global credential.helper store
printf 'http://%s:%s@%s\n' "$2" "$enc" "${1#http://}" > ~/.git-credentials
chmod 600 ~/.git-credentials
git config --global user.name "Lab Student"
git config --global user.email "student@example.com"
git config --global init.defaultBranch main
git config --global pull.rebase false
END
}

# gitea_seed_repo NAME SOURCE_DIR: creates the repository NAME on Gitea from
# the files in SOURCE_DIR (one initial commit) and clones it to /home/user/NAME.
gitea_seed_repo() {
  local name=$1 src=$2 tmp
  gitea_api -X DELETE "$GITEA_URL/api/v1/repos/$GITEA_USER/$name" >/dev/null 2>&1 || true
  gitea_api -X POST "$GITEA_URL/api/v1/user/repos" -d "{\"name\":\"$name\",\"default_branch\":\"main\"}" >/dev/null
  tmp=$(mktemp -d)
  cp -r "$src/." "$tmp/"
  chown -R user:user "$tmp"
  runuser -u user -- bash -s "$tmp" "$GITEA_URL/$GITEA_USER/$name.git" <<'END'
set -e
cd "$1"
git init -q -b main
git add -A
git commit -q -m "Initial commit"
git push -q "$2" main
END
  rm -rf "$tmp" "/home/user/$name"
  runuser -u user -- git clone -q "$GITEA_URL/$GITEA_USER/$name.git" "/home/user/$name"
}
