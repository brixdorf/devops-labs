#!/bin/bash
set -euo pipefail
pw="S3cret-$(openssl rand -hex 6 2>/dev/null || echo $RANDOM$RANDOM)"
mkdir -p /home/user/secret
printf '%s\n' "$pw" > /home/user/secret/db-password.txt
chown -R user:user /home/user/secret
printf '{"password": "%s"}\n' "$pw" > "$LAB_CONTEXT_FILE"
