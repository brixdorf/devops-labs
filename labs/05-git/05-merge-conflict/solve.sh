#!/bin/bash
set -uo pipefail
cd /home/user/website
git switch -q main
git merge feature/new-title >/dev/null 2>&1
python3 - <<'PY'
import re
text = open("index.html").read()
text = re.sub(r"<<<<<<< HEAD\n.*?>>>>>>> feature/new-title\n", "  <title>Northwind Shop | Welcome Home</title>\n", text, flags=re.S)
open("index.html", "w").write(text)
PY
git add index.html
git commit -q --no-edit
git log --oneline --graph --all > /home/user/merge-history.txt
