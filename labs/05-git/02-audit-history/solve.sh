#!/bin/bash
set -euo pipefail
cd /home/user/audit-tracker-repo
git log --oneline > compact-history.txt
git log -3 > last-3-commits.txt
git log -1 --format=%an > latest-author.txt
git log --oneline --grep=fix --grep=bug > bugfix-commits.txt
git show > latest-commit-changes.txt
