#!/bin/bash
set -euo pipefail
repo=/home/user/app-metrics-docs
rm -rf "$repo"
runuser -u user -- bash -c "
set -e
git init -q -b main $repo
cd $repo
git config user.name 'Priya Nair'
git config user.email 'priya@example.com'
echo '# App Metrics Docs' > README.md
git add README.md && git commit -q -m 'Add README'
mkdir -p docs && echo 'Request latency is measured in milliseconds.' > docs/latency.md
git add docs && git commit -q -m 'Document latency metric'
git branch develop
git branch hotfix-dashboard
echo 'Error rate is errors divided by requests.' > docs/errors.md
git add docs && git commit -q -m 'Document error rate metric'
"
head=$(runuser -u user -- git -C "$repo" rev-parse main)
printf '{"head": "%s"}\n' "$head" > "$LAB_CONTEXT_FILE"
