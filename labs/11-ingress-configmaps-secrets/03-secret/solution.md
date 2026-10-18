```bash
cd /home/user/secret
kubectl create secret generic db-credentials \
  --from-literal=username=appuser \
  --from-literal=password="$(cat db-password.txt)"

cat > app.yaml <<'END'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secret-demo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: secret-demo
  template:
    metadata:
      labels:
        app: secret-demo
    spec:
      containers:
        - name: app
          image: {{IMAGE_BUSYBOX}}
          command: ["sleep", "3600"]
          env:
            - name: DB_USER
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: username
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: password
          volumeMounts:
            - name: creds
              mountPath: /etc/db-credentials
              readOnly: true
      volumes:
        - name: creds
          secret:
            secretName: db-credentials
END
kubectl apply -f app.yaml
kubectl rollout status deployment/secret-demo
kubectl exec deploy/secret-demo -- sh -c 'echo "$DB_USER"; cat /etc/db-credentials/password'
```
