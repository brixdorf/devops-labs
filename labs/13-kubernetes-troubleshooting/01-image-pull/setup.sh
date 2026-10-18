#!/bin/bash
# Deploys catalog with a misspelled image tag and waits for the failure.
set -euo pipefail
broken="${IMAGE_NGINX%-alpine}-alpnie"
[ "$broken" = "$IMAGE_NGINX-alpnie" ] && broken="${IMAGE_NGINX}x"
cat <<END | kubectl apply -f - >/dev/null
apiVersion: apps/v1
kind: Deployment
metadata:
  name: catalog
spec:
  replicas: 2
  selector:
    matchLabels:
      app: catalog
  template:
    metadata:
      labels:
        app: catalog
    spec:
      containers:
        - name: catalog
          image: $broken
          ports:
            - containerPort: 80
END
for _ in $(seq 1 60); do
  kubectl get pods -l app=catalog --no-headers 2>/dev/null | grep -qE 'ImagePullBackOff|ErrImagePull' && break
  sleep 2
done
rm -f /home/user/diagnosis.txt /home/user/events.txt
uid=$(kubectl get deployment catalog -o jsonpath='{.metadata.uid}')
printf '{"broken": "%s", "uid": "%s"}\n' "$broken" "$uid" > "$LAB_CONTEXT_FILE"
