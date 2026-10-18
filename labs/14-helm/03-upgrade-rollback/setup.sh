#!/bin/bash
set -euo pipefail
rm -rf /home/user/charts && mkdir -p /home/user/charts
cp -r "$LAB_DIR/files/catalog" /home/user/charts/catalog
chown -R user:user /home/user/charts
helm install catalog /home/user/charts/catalog -n catalog --create-namespace \
  --set image.repository="${IMAGE_PODINFO_PREVIOUS%:*}" --set image.tag="${IMAGE_PODINFO_PREVIOUS##*:}" --wait --timeout 5m >/dev/null
