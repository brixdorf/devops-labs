#!/bin/bash
set -euo pipefail
. "$LAB_DIR/lib/gitea.sh"
repo="$LAB_DIR/files/repo"
key=$(python3 -c 'import secrets; print("AKIA" + "".join(secrets.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567") for _ in range(16)))')
secret=$(python3 -c 'import secrets, string; print("".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(40)))')
cat > "$repo/app/config.py" <<END
settings = {
    "region": "eu-west-1",
    "aws_access_key_id": "$key",
    "aws_secret": "$secret",
}
END
printf '%s\n' "$PIP_DJANGO_VULNERABLE" > "$repo/requirements.txt"
gitea_user_git_setup
gitea_seed_repo payments-api "$repo"
printf '{"key": "%s"}\n' "$key" > "$LAB_CONTEXT_FILE"
