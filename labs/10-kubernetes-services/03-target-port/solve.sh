#!/bin/bash
set -euo pipefail
kubectl rollout status deployment/payments --timeout=300s
cat <<'END' | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: payments-svc
spec:
  selector:
    app: payments
  ports:
    - port: 8080
      targetPort: http
END
sleep 3
kubectl run curl-test --image="$IMAGE_BUSYBOX" --rm -i --restart=Never --quiet -- wget -qO- http://payments-svc:8080/version > /home/user/payments-version.json
ep=$(kubectl get endpointslices -l kubernetes.io/service-name=payments-svc -o jsonpath='{.items[0].endpoints[0].addresses[0]}')
printf 'service_port=8080\ntarget_port=9898\nendpoint=%s:9898\n' "$ep" > /home/user/port-mapping.txt
