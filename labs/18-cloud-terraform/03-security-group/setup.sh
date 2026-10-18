#!/bin/bash
set -euo pipefail
. "$LAB_DIR/lib/moto-env.sh"
rm -rf /home/user/cloud && mkdir -p /home/user/cloud && chown user:user /home/user/cloud
