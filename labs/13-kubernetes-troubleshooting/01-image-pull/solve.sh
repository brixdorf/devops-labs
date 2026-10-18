#!/bin/bash
set -euo pipefail
image=$(kubectl get deployment catalog -o jsonpath='{.spec.template.spec.containers[0].image}')
printf 'pod_status=ImagePullBackOff\nbroken_image=%s\n' "$image" > /home/user/diagnosis.txt
kubectl set image deployment/catalog catalog="$IMAGE_NGINX"
kubectl rollout status deployment/catalog --timeout=300s
sleep 2
kubectl get events --sort-by=.lastTimestamp > /home/user/events.txt
