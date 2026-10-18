#!/bin/bash
set -euo pipefail
. "$LAB_DIR/lib/gitea.sh"
gitea_user_git_setup
gitea_seed_repo shop-web "$LAB_DIR/files/repo"
