## Objective

A **HorizontalPodAutoscaler** (HPA) adds and removes replicas of a Deployment based on measured CPU use. It only works when two things are in place, and finding out which is part of this lab. You will configure an HPA, put load on the application and watch the HPA react.

## Tasks

### Task 1: Deploy the application with CPU requests

Create a Deployment named `cpu-app` with `1` replica, image `{{IMAGE_PODINFO}}`, container name `podinfo`, container port `9898`, and these resources:

- CPU request `50m`, CPU limit `200m`

Create a Service named `cpu-app` (port `80`, target port `9898`) for it.

### Task 2: Create the autoscaler

Create an HPA named `cpu-app-hpa` for the Deployment `cpu-app`:

- minimum `1` replica, maximum `4` replicas
- target average CPU utilization `50` percent

### Task 3: Generate load and observe

Start a load generator Pod named `load-generator`:

```
kubectl run load-generator --image={{IMAGE_BUSYBOX}} --restart=Never -- /bin/sh -c "while true; do wget -q -O- http://cpu-app/; done"
```

Watch the HPA with `kubectl get hpa cpu-app-hpa -w`. Within a minute or two the TARGETS column shows a real CPU percentage instead of `<unknown>`, and the replica count may start to rise. Save one line of that output, while it shows a CPU percentage, to `/home/user/hpa/observed.txt`:

```
kubectl get hpa cpu-app-hpa > /home/user/hpa/observed.txt
```

### Task 4: Document the prerequisites

`/home/user/hpa/statements.txt` lists numbered statements about what an HPA needs. Create `/home/user/hpa/prerequisites.txt` with the IDs of the **two** statements that describe real prerequisites for CPU-based autoscaling, comma separated, for example `P1,P2`.

## Notes

- The `hpa` folder already contains `statements.txt`.
- You may delete the load generator when you are done; the checker does not need it.

## Expected outcome

`cpu-app` has CPU requests, `cpu-app-hpa` reads its CPU utilization, your saved output shows a measured percentage, and the prerequisites are identified.
