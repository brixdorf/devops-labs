```bash
kubectl create deployment backend --image={{IMAGE_PODINFO}} --replicas=3 --port=9898
kubectl rollout status deployment/backend
kubectl expose deployment backend --name=backend-svc --port=80 --target-port=9898
kubectl get endpointslices -l kubernetes.io/service-name=backend-svc -o wide > /home/user/endpoints.txt
kubectl get pods -l app=backend -o wide
kubectl run curl-test --image={{IMAGE_BUSYBOX}} --rm -i --restart=Never -- wget -qO- http://backend-svc/ > /home/user/backend-response.json
cat /home/user/backend-response.json
```
