#!/bin/bash
set -euo pipefail
kubectl create deployment backend-canary --image="$IMAGE_PODINFO" --replicas=1 >/dev/null
kubectl label deployment backend-canary track=canary >/dev/null
kubectl patch deployment backend-canary --type merge -p '{"spec":{"template":{"metadata":{"labels":{"app":"backend-canary","track":"canary"}}}}}' >/dev/null
rm -f /home/user/endpoints.txt /home/user/backend-response.json
