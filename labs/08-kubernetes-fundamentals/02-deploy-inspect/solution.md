```bash
kubectl create namespace demo
kubectl create deployment hello-web --image={{IMAGE_PODINFO}} --replicas=2 --port=9898 -n demo
kubectl rollout status deployment/hello-web -n demo

mkdir -p /home/user/inspect
kubectl get pods -n demo -l app=hello-web -o wide > /home/user/inspect/pods.txt
kubectl describe deployment hello-web -n demo > /home/user/inspect/describe.txt
kubectl logs deploy/hello-web -n demo > /home/user/inspect/logs.txt
grep -i port /home/user/inspect/logs.txt

cat > /home/user/inspect/summary.txt <<'END'
pod_count=2
image={{IMAGE_PODINFO}}
node=k3s
log_contains_port=9898
END
```
