#!/bin/bash
set -euo pipefail
cd /home/user/charts
helm upgrade catalog ./catalog -n catalog --reuse-values --set image.tag="${IMAGE_PODINFO##*:}" --set replicaCount=2 --wait --timeout 5m >/dev/null
helm history catalog -n catalog > history-after-upgrade.txt
helm rollback catalog 1 -n catalog --wait --timeout 5m >/dev/null
helm history catalog -n catalog > history-after-rollback.txt
helm status catalog -n catalog > final-status.txt
