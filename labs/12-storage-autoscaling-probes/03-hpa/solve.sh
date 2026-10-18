#!/bin/bash
set -euo pipefail
cd /home/user/hpa
cat <<END | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cpu-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cpu-app
  template:
    metadata:
      labels:
        app: cpu-app
    spec:
      containers:
        - name: podinfo
          image: $IMAGE_PODINFO
          ports:
            - containerPort: 9898
          resources:
            requests:
              cpu: 50m
            limits:
              cpu: 200m
---
apiVersion: v1
kind: Service
metadata:
  name: cpu-app
spec:
  selector:
    app: cpu-app
  ports:
    - port: 80
      targetPort: 9898
END
kubectl rollout status deployment/cpu-app --timeout=300s
kubectl autoscale deployment cpu-app --name=cpu-app-hpa --min=1 --max=4 --cpu-percent=50
kubectl run load-generator --image="$IMAGE_BUSYBOX" --restart=Never -- /bin/sh -c "while true; do wget -q -O- http://cpu-app/; done"
for _ in $(seq 1 90); do
  kubectl get hpa cpu-app-hpa > observed.txt
  grep -qE '[0-9]+%/50%' observed.txt && break
  sleep 3
done
grep -E 'metrics-server|CPU requests' statements.txt | cut -d: -f1 | paste -sd, - > prerequisites.txt
kubectl delete pod load-generator --wait=false
