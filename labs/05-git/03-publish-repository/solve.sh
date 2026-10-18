#!/bin/bash
set -euo pipefail
cd /home/user/todo-app
git init -q -b main
git config user.name "Lab Student"
git config user.email "student@example.com"
git add todo.py && git commit -q -m "Add to-do list module"
git add test_todo.py && git commit -q -m "Add tests for the to-do list"
printf '# Todo App\n\nA tiny command line to-do list written in Python.\n' > README.md
git add README.md && git commit -q -m "Add README with usage notes"
auth="Authorization: Basic $(printf '%s:%s' "$GITEA_USER" "$GITEA_PASSWORD" | base64 -w0)"
curl -sf -H "$auth" -H 'Content-Type: application/json' -X POST "$GITEA_URL/api/v1/user/repos" -d '{"name":"todo-app"}' >/dev/null
git remote add origin "$GITEA_URL/$GITEA_USER/todo-app.git"
git -c "http.extraHeader=$auth" push -q -u origin main
