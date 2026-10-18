```bash
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
git commit -m "Add CI workflow"
git push
```

Then open {{GITEA_URL}}/{{GITEA_USER}}/calculator/actions and wait for the green check mark.
