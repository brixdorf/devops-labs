```bash
cd /home/user/payments-api
mkdir -p .gitea/workflows
cat > .gitea/workflows/security.yml <<'END'
name: Security
on: push

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - name: SAST with Bandit
        run: bandit -r app -lll
      - name: Dependency scan with Trivy
        run: trivy fs --scanners vuln --severity HIGH,CRITICAL --exit-code 1 .
      - name: Secret scan with Gitleaks
        run: gitleaks dir . --no-banner

  build:
    runs-on: ubuntu-latest
    needs: security
    steps:
      - uses: actions/checkout@v7
      - name: Build
        run: make build
END
git add .gitea && git commit -m "Add security gate" && git push      # security fails, build is skipped
```

Fix the findings:

```bash
sed -i 's/subprocess.call(f"ping -c 1 {host}", shell=True)/subprocess.call(["ping", "-c", "1", host])/' app/app.py
cat > app/config.py <<'END'
import os

settings = {"aws_secret": os.environ.get("AWS_SECRET_ACCESS_KEY", "")}
END
echo "{{PIP_DJANGO}}" > requirements.txt
git commit -am "Fix security findings" && git push                  # both jobs pass
```
