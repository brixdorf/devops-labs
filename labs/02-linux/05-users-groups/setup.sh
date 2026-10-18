#!/bin/bash
set -euo pipefail
id examuser >/dev/null 2>&1 && userdel -r examuser 2>/dev/null || true
getent group devops >/dev/null && groupdel devops || true
rm -rf /srv/devops-project
