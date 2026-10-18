1. Write the Application manifest (or fill in the New App form) and create it.
2. Watch `kubectl -n argocd get application web -w` until it is Synced and Healthy, then check `kubectl -n web get deploy web`.
3. Edit the replica count in Git, commit and push.
4. Wait for the Deployment to show 4/4 and for the Application's revision to match your commit (`git rev-parse HEAD`).
5. Save the revision.
