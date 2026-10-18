1. Create the ConfigMap and check it with `kubectl describe configmap app-config`.
2. Generate a Deployment manifest with `--dry-run=client -o yaml`, rename the container to `app`, and add `envFrom`.
3. Apply it, wait for the Pod, and check `kubectl exec deploy/config-demo -- env`.
4. Save the three variables to the file.
