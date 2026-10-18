- `kubectl create configmap app-config --from-literal=KEY=value ...`
- `kubectl create deployment config-demo --image=... --dry-run=client -o yaml -- sleep 3600 > deploy.yaml` writes a manifest you can edit.
- Under the container, add:

```yaml
envFrom:
  - configMapRef:
      name: app-config
```
