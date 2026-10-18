```bash
cd /home/user/charts
cat > prod-values.yaml <<'END'
replicaCount: 3
image:
  repository: nginx
  tag: "<tag of {{IMAGE_NGINX}}>"
service:
  port: 8080
END
helm template shop ./shop -f prod-values.yaml > rendered.yaml
grep -E 'image:|replicas:|port:' rendered.yaml
helm install shop ./shop -f prod-values.yaml -n shop --create-namespace
kubectl rollout status deployment/shop -n shop
kubectl get deploy,svc -n shop
helm get values shop -n shop > installed-values.txt
```
