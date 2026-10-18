```bash
kubectl get pods -l app=frontend --show-labels
kubectl describe service frontend-svc          # Selector: app=front-end, Endpoints: <none>

cat > /home/user/diagnosis.txt <<'END'
endpoints_before=0
service_selector=app=front-end
pod_labels=app=frontend
END

kubectl patch service frontend-svc -p '{"spec":{"selector":{"app":"frontend"}}}'
kubectl get endpointslices -l kubernetes.io/service-name=frontend-svc
kubectl run curl-test --image={{IMAGE_BUSYBOX}} --rm -i --restart=Never -- wget -qO- http://frontend-svc/
```
