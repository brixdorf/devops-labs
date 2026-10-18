#!/bin/bash
set -euo pipefail
cat <<END | kubectl apply -f - >/dev/null
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payments
spec:
  replicas: 2
  selector:
    matchLabels:
      app: payments
  template:
    metadata:
      labels:
        app: payments
    spec:
      containers:
        - name: payments
          image: $IMAGE_PODINFO
          ports:
            - name: http
              containerPort: 9898
END
rm -f /home/user/payments-version.json /home/user/port-mapping.txt
