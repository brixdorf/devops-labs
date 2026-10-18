#!/bin/bash
set -euo pipefail
. "$LAB_DIR/lib/gitea.sh"
printf '%s\n' "$PIP_PYTEST" > "$LAB_DIR/files/repo/requirements.txt"
gitea_user_git_setup
gitea_seed_repo calculator "$LAB_DIR/files/repo"
