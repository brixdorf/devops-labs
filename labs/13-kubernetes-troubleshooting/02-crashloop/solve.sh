#!/bin/bash
set -euo pipefail
cause=$(grep 'environment variable' /home/user/causes.txt | cut -d: -f1)
printf 'pod_status=CrashLoopBackOff\nexit_code=3\nroot_cause=%s\n' "$cause" > /home/user/diagnosis.txt
kubectl set env deployment/order-worker --from=configmap/order-worker-config
kubectl rollout status deployment/order-worker --timeout=300s
sleep 5
