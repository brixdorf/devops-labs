1. `kubectl get pods` and `kubectl describe pod` for one `catalog` Pod.
2. `kubectl get events --sort-by=.lastTimestamp` shows "Failed to pull image" errors.
3. Write `diagnosis.txt`.
4. Fix the image with `kubectl set image` (the container is named `catalog`) or `kubectl edit`.
5. `kubectl rollout status deployment/catalog`, then save the events.
