#!/bin/bash
set -euo pipefail
rm -rf /home/user/charts && mkdir -p /home/user/charts
cp -r "$LAB_DIR/files/shop" /home/user/charts/shop
chown -R user:user /home/user/charts
