#!/bin/bash
set -euo pipefail
mkdir -p /home/user/rollout
kubectl create deployment catalog --image="$IMAGE_PODINFO_PREVIOUS" --replicas=3
kubectl rollout status deployment/catalog --timeout=300s
kubectl set image deployment/catalog podinfo="$IMAGE_PODINFO"
kubectl rollout status deployment/catalog --timeout=300s
kubectl rollout history deployment/catalog > /home/user/rollout/history-after-update.txt
kubectl rollout undo deployment/catalog
kubectl rollout status deployment/catalog --timeout=300s
kubectl rollout history deployment/catalog > /home/user/rollout/history-after-rollback.txt
printf 'current_image=%s\nrevisions=2\n' "$IMAGE_PODINFO_PREVIOUS" > /home/user/rollout/result.txt
