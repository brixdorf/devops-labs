```bash
mkdir -p /home/user/probes && cd /home/user/probes
cat > probe-demo.yaml <<'END'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: probe-demo
spec:
  replicas: 2
  selector:
    matchLabels:
      app: probe-demo
  template:
    metadata:
      labels:
        app: probe-demo
    spec:
      containers:
        - name: podinfo
          image: {{IMAGE_PODINFO}}
          ports:
            - containerPort: 9898
          readinessProbe:
            httpGet: {path: /readyz, port: 9898}
            periodSeconds: 3
          livenessProbe:
            httpGet: {path: /healthz, port: 9898}
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: probe-svc
spec:
  selector:
    app: probe-demo
  ports:
    - port: 80
      targetPort: 9898
END
kubectl apply -f probe-demo.yaml
kubectl rollout status deployment/probe-demo

pod=$(kubectl get pods -l app=probe-demo -o jsonpath='{.items[0].metadata.name}')
kubectl exec "$pod" -- wget -qO- --post-data='' http://localhost:9898/readyz/disable
kubectl get pods -l app=probe-demo -w        # wait for 0/1, then Ctrl+C
kubectl get endpointslices -l kubernetes.io/service-name=probe-svc -o wide
echo "$pod" > not-ready-pod.txt

cat > liveness-demo.yaml <<'END'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: liveness-demo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: liveness-demo
  template:
    metadata:
      labels:
        app: liveness-demo
    spec:
      containers:
        - name: app
          image: {{IMAGE_BUSYBOX}}
          command: ["sh", "-c", "touch /tmp/healthy; sleep 3600"]
          livenessProbe:
            exec:
              command: ["cat", "/tmp/healthy"]
            periodSeconds: 5
            failureThreshold: 2
END
kubectl apply -f liveness-demo.yaml
kubectl rollout status deployment/liveness-demo
kubectl exec deploy/liveness-demo -- rm /tmp/healthy
kubectl get pods -l app=liveness-demo -w     # RESTARTS becomes 1 after about 10 seconds
kubectl get pods -l app=liveness-demo -o jsonpath='{.items[0].status.containerStatuses[0].restartCount}' > restarts.txt
```
