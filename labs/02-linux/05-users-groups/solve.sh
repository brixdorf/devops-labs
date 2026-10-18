#!/bin/bash
set -euo pipefail
s() { echo "$SUDO_PASSWORD" | sudo -S -p '' "$@"; }
s groupadd devops
s useradd -m -s /bin/bash examuser
s usermod -aG devops examuser
s mkdir -p /srv/devops-project
s chown examuser:devops /srv/devops-project
s chmod 2770 /srv/devops-project
