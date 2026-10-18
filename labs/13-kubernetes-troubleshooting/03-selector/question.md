## Scenario

The `frontend` Pods are running and healthy, yet every request to the `frontend-svc` Service fails. Nothing looks broken at first sight. Use labels, selectors, endpoints and the Service configuration to find the problem, then fix it.

## Tasks

### Task 1: Diagnose

Compare the labels of the `frontend` Pods with the selector of `frontend-svc`, and look at the Service's endpoints.

### Task 2: Record the diagnosis

Create `/home/user/diagnosis.txt` with:

```
endpoints_before=<number of endpoint addresses frontend-svc had before your fix>
service_selector=<the Service's selector before your fix, as key=value>
pod_labels=<the app label of the frontend Pods, as key=value>
```

### Task 3: Fix it

Fix the **Service** so it selects the `frontend` Pods. Do not change the Deployment or its Pod labels: other tools depend on them.

### Task 4: Verify

Check that `frontend-svc` now has the `frontend` Pods as endpoints, and that a request through the Service works, for example:

```
kubectl run curl-test --image={{IMAGE_BUSYBOX}} --rm -i --restart=Never -- wget -qO- http://frontend-svc/
```

## Notes

- A Service with no matching Pods has no endpoints, so connections to it fail even though nothing has crashed.

## Expected outcome

`frontend-svc` selects the `frontend` Pods and serves requests, the Deployment is unchanged, and your diagnosis explains the mismatch.
