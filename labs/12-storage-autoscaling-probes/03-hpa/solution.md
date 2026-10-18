```bash
mkdir -p /home/user/hpa && cd /home/user/hpa
cat <<'END' | kubectl apply -f -
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
          image: {{IMAGE_PODINFO}}
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
kubectl autoscale deployment cpu-app --name=cpu-app-hpa --min=1 --max=4 --cpu-percent=50
kubectl run load-generator --image={{IMAGE_BUSYBOX}} --restart=Never -- /bin/sh -c "while true; do wget -q -O- http://cpu-app/; done"
kubectl get hpa cpu-app-hpa -w            # wait until TARGETS shows cpu: NN%/50%
kubectl get hpa cpu-app-hpa > observed.txt
kubectl delete pod load-generator
```

The two prerequisites are: a running **metrics-server** (it supplies the CPU measurements through the metrics API), and **CPU requests** on the containers (utilization is a percentage of the request). Pick the statements that say this, for example `P2,P5` (your IDs differ).
