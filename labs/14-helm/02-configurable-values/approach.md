1. Read `shop/values.yaml` to see the structure.
2. Write `prod-values.yaml` with the four settings.
3. Render with `helm template ... > rendered.yaml` and read it.
4. Install with `helm install`, then `kubectl rollout status deployment/shop -n shop`.
5. `helm get values shop -n shop > installed-values.txt`
