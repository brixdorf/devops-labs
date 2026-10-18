#!/bin/bash
set -euo pipefail
cd /home/user/task_8
echo "$SUDO_PASSWORD" | sudo -S -p '' chown nobody:nogroup audit.log
echo "$SUDO_PASSWORD" | sudo -S -p '' chown nobody confidential/file1 confidential/file2
