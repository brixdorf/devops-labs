1. Create the deployment and wait with `kubectl rollout status`.
2. Append the ready count to `replicas.txt`.
3. Scale to 5, wait, append.
4. Scale to 2, wait until the extra Pods are gone, append.
5. `cat /home/user/replicas.txt` should show 2, 5 and 2. `kubectl describe deployment shop-api` lists the scaling events.
