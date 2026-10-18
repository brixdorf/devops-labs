```bash
kubectl create configmap app-config --from-literal=APP_COLOR=teal --from-literal=APP_MODE=staging --from-literal=MAX_UPLOAD_MB=25
cat <<'END' | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: config-demo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: config-demo
  template:
    metadata:
      labels:
        app: config-demo
    spec:
      containers:
        - name: app
          image: {{IMAGE_BUSYBOX}}
          command: ["sleep", "3600"]
          envFrom:
            - configMapRef:
                name: app-config
END
kubectl rollout status deployment/config-demo
kubectl exec deploy/config-demo -- env | grep -E 'APP_|MAX_' | sort > /home/user/config-check.txt
```
