#!/bin/bash
set -euo pipefail
record() { kubectl get deployment shop-api -o jsonpath='{.status.readyReplicas}{"\n"}' >> /home/user/replicas.txt; }
wait_ready() {
  for _ in $(seq 1 120); do
    r=$(kubectl get deployment shop-api -o jsonpath='{.status.readyReplicas}')
    n=$(kubectl get pods -l app=shop-api --no-headers 2>/dev/null | wc -l)
    [ "$r" = "$1" ] && [ "$n" = "$1" ] && return 0
    sleep 2
  done
  return 1
}
kubectl create deployment shop-api --image="$IMAGE_PODINFO" --replicas=2
wait_ready 2; record
kubectl scale deployment shop-api --replicas=5
wait_ready 5; record
kubectl scale deployment shop-api --replicas=2
wait_ready 2; record
