#!/bin/bash
set -euo pipefail
kubectl create deployment backend --image="$IMAGE_PODINFO" --replicas=3 --port=9898
kubectl rollout status deployment/backend --timeout=300s
kubectl expose deployment backend --name=backend-svc --port=80 --target-port=9898
sleep 3
kubectl get endpointslices -l kubernetes.io/service-name=backend-svc -o wide > /home/user/endpoints.txt
kubectl run curl-test --image="$IMAGE_BUSYBOX" --rm -i --restart=Never --quiet -- wget -qO- http://backend-svc/ > /home/user/backend-response.json
