#!/bin/bash
set -euo pipefail
mkdir -p /home/user/pod
cat > /home/user/pod/nginx-pod.yaml <<END
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
  labels:
    app: web
    tier: frontend
spec:
  containers:
    - name: nginx
      image: $IMAGE_NGINX
      ports:
        - containerPort: 80
END
kubectl apply -f /home/user/pod/nginx-pod.yaml
kubectl wait --for=condition=Ready pod/nginx-pod --timeout=300s
kubectl exec nginx-pod -- curl -s localhost >/dev/null
cat > /home/user/pod/pod-info.txt <<END
status=$(kubectl get pod nginx-pod -o jsonpath='{.status.phase}')
ip=$(kubectl get pod nginx-pod -o jsonpath='{.status.podIP}')
node=$(kubectl get pod nginx-pod -o jsonpath='{.spec.nodeName}')
labels=app=web,tier=frontend
END
kubectl logs nginx-pod > /home/user/pod/nginx-pod.log
