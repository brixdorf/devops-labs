## Objective

Deploy a small web application to the cluster and use the three most important inspection commands, `kubectl get`, `kubectl describe` and `kubectl logs`, to confirm that it reaches a healthy state.

## Tasks

### Task 1: Create a namespace

Create a namespace named `demo`.

### Task 2: Deploy the application

In the `demo` namespace, create a Deployment:

- name: `hello-web`
- image: `{{IMAGE_PODINFO}}`
- replicas: `2`
- container port: `9898`

You can use `kubectl create deployment` or write a YAML manifest and `kubectl apply` it.

### Task 3: Wait until it is healthy

Wait until both replicas are available. `kubectl rollout status` waits for you.

### Task 4: Inspect it and save the output

Save the output of these commands:

- `kubectl get` for the pods of the deployment, in wide format: `/home/user/inspect/pods.txt`
- `kubectl describe` of the deployment: `/home/user/inspect/describe.txt`
- `kubectl logs` of one of the deployment's pods: `/home/user/inspect/logs.txt`

### Task 5: Record what you saw

Create `/home/user/inspect/summary.txt` with:

```
pod_count=<number of pods of hello-web>
image=<image used by the pods>
node=<name of the node the pods run on>
log_contains_port=<the port number the application says it listens on in its logs>
```

## Notes

- The `inspect` folder does not exist yet.
- Leave the deployment running when you submit.

## Expected outcome

`hello-web` runs two healthy replicas in `demo`, and the saved files show what get, describe and logs report.
