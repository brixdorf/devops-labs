1. Look at the deployments with `kubectl get deploy,pods -n web --show-labels`.
2. Create both Services.
3. Create the Ingress with `kubectl create ingress` or a YAML manifest with two `rules`, each with a `host` and an `http.paths` entry.
4. `kubectl describe ingress site-ingress -n web` shows the rules and backends.
5. Test with `curl -H 'Host: ...' http://k3s/` and save the responses.
