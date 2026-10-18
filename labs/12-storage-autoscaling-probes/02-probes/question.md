## Objective

Kubernetes uses **probes** to check containers. A failing **readiness** probe takes a Pod out of its Service, so it gets no traffic, but leaves it running. A failing **liveness** probe makes the kubelet restart the container. You will configure both and watch how Kubernetes reacts when an application stops being ready or becomes unhealthy.

## Tasks

### Task 1: Readiness and liveness for a web app

Create a Deployment named `probe-demo` with `2` replicas, image `{{IMAGE_PODINFO}}`, container name `podinfo`, container port `9898`, and:

- a **readiness** probe: HTTP GET on path `/readyz`, port `9898`, every `3` seconds
- a **liveness** probe: HTTP GET on path `/healthz`, port `9898`, every `5` seconds

Create a Service named `probe-svc` (port `80`, target port `9898`) for its Pods.

### Task 2: Make one Pod not ready

podinfo can be told to report itself as not ready. Pick **one** `probe-demo` Pod and run:

```
kubectl exec <pod name> -- wget -qO- --post-data='' http://localhost:9898/readyz/disable
```

Watch it with `kubectl get pods` until its READY column shows `0/1`, and check that it disappears from the endpoints of `probe-svc`. Write the name of that Pod to `/home/user/probes/not-ready-pod.txt`. Leave it in this state.

### Task 3: A liveness probe that restarts a container

Create a Deployment named `liveness-demo` with `1` replica, image `{{IMAGE_BUSYBOX}}`, container name `app`, and the command:

```
sh -c 'touch /tmp/healthy; sleep 3600'
```

Give it a liveness probe that runs the command `cat /tmp/healthy` every `5` seconds and fails after `2` failures.

### Task 4: Make it unhealthy

Delete the file `/tmp/healthy` in the `liveness-demo` container. Watch the RESTARTS column: the kubelet restarts the container, and the restarted container creates the file again. When the restart count is at least 1, write it to `/home/user/probes/restarts.txt`.

## Notes

- The `probes` folder does not exist yet.
- `kubectl describe pod <name>` shows probe failures in the Events section.

## Expected outcome

One `probe-demo` Pod is running but not ready and has no traffic, the other serves `probe-svc`, and `liveness-demo` was restarted by its liveness probe.
