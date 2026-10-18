## Objective

A Deployment keeps a requested number of identical Pods (replicas) running. Scaling it changes that number, and Kubernetes creates or removes Pods to match. You will scale a Deployment up for a traffic peak and back down afterwards, verifying the replica count at every step.

## Tasks

### Task 1: Create the Deployment

Create a Deployment:

- name: `shop-api`
- image: `{{IMAGE_PODINFO}}`
- replicas: `2`

Wait until both replicas are ready.

### Task 2: Scale up

Scale `shop-api` to `5` replicas and wait until all five are ready.

### Task 3: Scale back down

Scale `shop-api` back to `2` replicas and wait until only two Pods remain.

### Task 4: Record each step

After each of the three steps, append the output of this command to `/home/user/replicas.txt`:

```
kubectl get deployment shop-api -o jsonpath='{.status.readyReplicas}{"\n"}' >> /home/user/replicas.txt
```

The file must end up with three lines: `2`, `5` and `2`.

## Notes

- Use `kubectl scale`, or edit the replica count and `kubectl apply` again. Both are fine.
- The checker also reads the Deployment's events to confirm that the scaling really happened.

## Expected outcome

`shop-api` runs 2 ready replicas, its events show the scale-up to 5 and back to 2, and `replicas.txt` contains 2, 5 and 2.
