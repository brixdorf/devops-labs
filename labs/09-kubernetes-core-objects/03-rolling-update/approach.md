1. Create the deployment with version 1 and wait with `kubectl rollout status`.
2. `kubectl set image` to version 2, then `kubectl rollout status` again.
3. Check the images with `kubectl get pods -o jsonpath='{..image}'` or `kubectl describe`.
4. Save the history, run `kubectl rollout undo deployment/catalog`, wait, and save the history again.
5. Write `result.txt`.
