## Scenario

The `order-worker` Deployment starts, crashes, starts again and crashes again. Kubernetes waits a little longer after every crash, which shows up as `CrashLoopBackOff`. Use the logs and `kubectl describe` to find the root cause, fix the configuration, and verify that the worker recovers.

## Tasks

### Task 1: Diagnose

Read the container logs of an `order-worker` Pod (including the logs of the previous, crashed container) and `kubectl describe` the Pod. The worker explains what it is missing.

### Task 2: Record the root cause

The possible root causes are listed in `/home/user/causes.txt`. Create `/home/user/diagnosis.txt` with:

```
pod_status=<the status shown in kubectl get pods>
exit_code=<exit code of the last terminated container>
root_cause=<the ID of the root cause from causes.txt>
```

### Task 3: Fix the configuration

The worker needs the setting it complains about. The correct values are kept in the ConfigMap `order-worker-config`, which already exists. Change the `order-worker` Deployment so the container receives that setting **from the ConfigMap** (do not type the value into the Deployment).

### Task 4: Verify the recovery

Wait until the new Pod is running and stays running, and check its logs: it prints `worker started` when it is healthy.

## Notes

- `kubectl logs <pod> --previous` shows the output of the container that crashed.

## Expected outcome

`order-worker` runs without restarting, gets its setting from `order-worker-config`, and `diagnosis.txt` records the status, the exit code and the root cause.
