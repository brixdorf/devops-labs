1. Create the deployment and wait for it.
2. Create the Service with `kubectl expose` or a YAML manifest.
3. Compare `kubectl get endpointslices -l kubernetes.io/service-name=backend-svc -o wide` with `kubectl get pods -l app=backend -o wide`: the addresses must match, and no canary Pod may appear.
4. Run the temporary Pod and save its output.
