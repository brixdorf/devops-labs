```bash
kubectl get pods -l app=order-worker                 # CrashLoopBackOff
pod=$(kubectl get pods -l app=order-worker -o jsonpath='{.items[0].metadata.name}')
kubectl logs "$pod" --previous                       # ERROR: QUEUE_URL is not set
kubectl describe pod "$pod" | grep -A5 'Last State'  # Exit Code: 3
cat /home/user/causes.txt

cat > /home/user/diagnosis.txt <<'END'
pod_status=CrashLoopBackOff
exit_code=3
root_cause=C2
END

kubectl describe configmap order-worker-config
kubectl set env deployment/order-worker --from=configmap/order-worker-config
kubectl rollout status deployment/order-worker
kubectl logs deploy/order-worker                     # worker started
```

The root cause ID depends on the order in `causes.txt`: choose the one that says a required environment variable is missing.
