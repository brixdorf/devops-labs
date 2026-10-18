#!/bin/bash
set -euo pipefail
repo=/home/user/audit-tracker-repo
rm -rf "$repo"
runuser -u user -- bash -s "$repo" <<'END'
set -e
repo=$1
git init -q -b main "$repo"
cd "$repo"
commit() {
  local name=$1 email=$2 msg=$3 file=$4 text=$5
  mkdir -p "$(dirname "$file")"
  printf '%s\n' "$text" >> "$file"
  git add "$file"
  GIT_AUTHOR_NAME="$name" GIT_AUTHOR_EMAIL="$email" GIT_COMMITTER_NAME="$name" GIT_COMMITTER_EMAIL="$email" \
    git commit -q -m "$msg"
}
commit "Alice Johnson" alice@example.com "Create audit tracker skeleton" README.md "# Audit Tracker"
commit "Bob Smith" bob@example.com "Add event model" src/events.py "class Event: pass"
commit "Carol Diaz" carol@example.com "fix login redirect loop" src/auth.py "REDIRECT_LIMIT = 3"
commit "Alice Johnson" alice@example.com "Add CSV export" src/export.py "def export(): return []"
commit "Dmitri Volkov" dmitri@example.com "Resolve bug in CSV export header" src/export.py "HEADER = ['id', 'time']"
commit "Bob Smith" bob@example.com "Document the audit retention policy" docs/retention.md "Events are kept for 90 days."
commit "Carol Diaz" carol@example.com "fix crash when the report is empty" src/report.py "if not rows: return ''"
commit "Erin Walsh" erin@example.com "Add daily summary email" src/summary.py "SEND_AT = '07:00'"
END
