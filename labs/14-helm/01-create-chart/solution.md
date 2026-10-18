```bash
cd /home/user/charts
helm create webapp
sed -i 's/^description:.*/description: A simple web application/; s/^version:.*/version: 0.2.0/; s/^appVersion:.*/appVersion: "1.0.0"/' webapp/Chart.yaml
```

Edit `webapp/values.yaml` (the image `{{IMAGE_NGINX}}` split at the colon):

```yaml
replicaCount: 2
image:
  repository: nginx
  pullPolicy: IfNotPresent
  tag: "<tag of {{IMAGE_NGINX}}>"
```

```bash
helm lint ./webapp
helm template webapp ./webapp > webapp-rendered.yaml
grep 'image:' webapp-rendered.yaml
```

For `purpose.txt`, choose (IDs differ per session):

- Chart.yaml: metadata about the chart, such as its name, version and app version
- values.yaml: default configuration values that templates read and users can override
- templates: Kubernetes manifests with placeholders that Helm fills in from the values
