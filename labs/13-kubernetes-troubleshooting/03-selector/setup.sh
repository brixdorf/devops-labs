#!/bin/bash
set -euo pipefail
cat <<END | kubectl apply -f - >/dev/null
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
        tier: web
    spec:
      containers:
        - name: web
          image: $IMAGE_NGINX
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: frontend-svc
spec:
  selector:
    app: front-end
  ports:
    - port: 80
      targetPort: 80
END
kubectl rollout status deployment/frontend --timeout=300s >/dev/null
rm -f /home/user/diagnosis.txt
gen=$(kubectl get deployment frontend -o jsonpath='{.metadata.generation}')
printf '{"generation": "%s"}\n' "$gen" > "$LAB_CONTEXT_FILE"
