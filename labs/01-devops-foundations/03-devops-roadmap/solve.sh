#!/bin/bash
set -euo pipefail
cd /home/user/roadmap
cat > roadmap.md <<'END'
# DevOps Roadmap

1. Version control: move the code to Git so every change is tracked and reversible
2. Automated tests: run tests on every change so bugs are caught before users see them
3. Containerization: package the app so it runs the same on every machine
4. CI/CD: build, test and deploy automatically instead of copying files by hand
5. Monitoring: watch errors and uptime so outages are noticed before users complain
END
r() { grep -E "$1" reasons.txt | cut -d: -f1; }
{
  echo "P1=$(r 'tracked')"
  echo "P2=$(r 'Bugs are caught')"
  echo "P3=$(r 'same way')"
  echo "P4=$(r 'automatically')"
  echo "P5=$(r 'outages')"
} > reasons-answer.txt
