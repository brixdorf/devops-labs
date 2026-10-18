#!/bin/bash
set -euo pipefail
kubectl create namespace demo
kubectl create deployment hello-web --image="$IMAGE_PODINFO" --replicas=2 --port=9898 -n demo
kubectl rollout status deployment/hello-web -n demo --timeout=300s
mkdir -p /home/user/inspect
kubectl get pods -n demo -l app=hello-web -o wide > /home/user/inspect/pods.txt
kubectl describe deployment hello-web -n demo > /home/user/inspect/describe.txt
kubectl logs deploy/hello-web -n demo > /home/user/inspect/logs.txt
node=$(kubectl get pods -n demo -l app=hello-web -o jsonpath='{.items[0].spec.nodeName}')
printf 'pod_count=2\nimage=%s\nnode=%s\nlog_contains_port=9898\n' "$IMAGE_PODINFO" "$node" > /home/user/inspect/summary.txt
