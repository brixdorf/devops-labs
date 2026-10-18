#!/bin/bash
set -euo pipefail
cd /home/user/calculator
mkdir -p .gitea/workflows
cat > .gitea/workflows/ci.yml <<'END'
name: CI
on: push

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Check out the code
        uses: actions/checkout@v7
      - name: Install dependencies
        run: pip install -r requirements.txt
      - name: Build
        run: make build
END
git add .gitea/workflows/ci.yml
git commit -q -m "Add CI workflow"
git push -q
