```bash
record() { kubectl get deployment shop-api -o jsonpath='{.status.readyReplicas}{"\n"}' >> /home/user/replicas.txt; }

kubectl create deployment shop-api --image={{IMAGE_PODINFO}} --replicas=2
kubectl rollout status deployment/shop-api
record

kubectl scale deployment shop-api --replicas=5
kubectl rollout status deployment/shop-api
record

kubectl scale deployment shop-api --replicas=2
kubectl wait --for=delete pod -l app=shop-api --timeout=60s 2>/dev/null; sleep 5
kubectl get pods -l app=shop-api
record

cat /home/user/replicas.txt
```
