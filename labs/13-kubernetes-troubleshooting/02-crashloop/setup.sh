#!/bin/bash
set -euo pipefail
kubectl create configmap order-worker-config --from-literal=QUEUE_URL=amqp://queue.internal:5672/orders >/dev/null
cat <<END | kubectl apply -f - >/dev/null
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-worker
spec:
  replicas: 1
  selector:
    matchLabels:
      app: order-worker
  template:
    metadata:
      labels:
        app: order-worker
    spec:
      containers:
        - name: worker
          image: $IMAGE_BUSYBOX
          command:
            - sh
            - -c
            - |
              echo "order-worker 2.3.1 booting"
              if [ -z "\$QUEUE_URL" ]; then
                echo "ERROR: QUEUE_URL is not set. Cannot connect to the order queue." >&2
                exit 3
              fi
              echo "worker started, consuming from \$QUEUE_URL"
              while true; do sleep 30; done
END
causes=(
  "env|A required environment variable is missing."
  "image|The container image does not exist."
  "memory|The container is killed because it uses more memory than its limit."
  "probe|A failing liveness probe restarts the container."
)
json="" n=1
: > /home/user/causes.txt
for i in $(printf '%s\n' "${!causes[@]}" | shuf); do
  echo "C$n: ${causes[$i]#*|}" >> /home/user/causes.txt
  [ "${causes[$i]%%|*}" = env ] && json="C$n"
  n=$((n + 1))
done
chown user:user /home/user/causes.txt
for _ in $(seq 1 90); do
  kubectl get pods -l app=order-worker --no-headers 2>/dev/null | grep -q CrashLoopBackOff && break
  sleep 2
done
rm -f /home/user/diagnosis.txt
uid=$(kubectl get deployment order-worker -o jsonpath='{.metadata.uid}')
printf '{"cause": "%s", "uid": "%s"}\n' "$json" "$uid" > "$LAB_CONTEXT_FILE"
