1. `kubectl get pods`, then `kubectl logs <pod> --previous` and `kubectl describe pod <pod>`.
2. Note the status, the exit code under "Last State", and the missing setting from the log.
3. Match it to `causes.txt` and write `diagnosis.txt`.
4. Add the setting from the ConfigMap with `kubectl set env --from=configmap/...` or by editing the Deployment (`envFrom` or `valueFrom.configMapKeyRef`).
5. `kubectl rollout status deployment/order-worker`, then `kubectl logs deploy/order-worker`.
