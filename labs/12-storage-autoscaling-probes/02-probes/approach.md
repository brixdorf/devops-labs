1. Write a manifest for `probe-demo` with both probes, plus the `probe-svc` Service, and apply it.
2. Pick one Pod name from `kubectl get pods -l app=probe-demo`, disable its readiness with the `wget` command, and wait for `0/1`.
3. Compare the endpoints with the Pod IPs, then save the Pod name.
4. Write and apply the `liveness-demo` manifest with the exec probe.
5. Remove `/tmp/healthy`, watch `kubectl get pods -w` for the restart, then save the restart count.
