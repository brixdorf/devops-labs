## Scenario

A teammate deployed the `catalog` service before going on holiday, and its Pods never started. Your job is to find out why with `kubectl get`, `kubectl describe` and the cluster events, fix the Deployment, and confirm that it recovers.

## Tasks

### Task 1: Diagnose

Look at the `catalog` Pods and their events. Find the status the Pods are stuck in and the reason in the events.

### Task 2: Record the diagnosis

Create `/home/user/diagnosis.txt` with:

```
pod_status=<the status shown in the STATUS column of kubectl get pods>
broken_image=<the image the Deployment tries to use>
```

### Task 3: Fix the Deployment

The `catalog` container should run `{{IMAGE_NGINX}}`. Correct the image of the existing Deployment (do not delete and recreate it).

### Task 4: Verify the recovery

Wait until all `catalog` replicas are available, then save the cluster events for the namespace to `/home/user/events.txt` with `kubectl get events --sort-by=.lastTimestamp`.

## Notes

- `ImagePullBackOff` means Kubernetes tried to pull the image, failed, and is now waiting before it tries again.

## Expected outcome

`catalog` runs all its replicas with the correct image, and your diagnosis names the status and the broken image.
