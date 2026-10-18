## Objective

The Pod is the smallest thing Kubernetes runs. Create one from a YAML manifest, then inspect its status, labels, IP address and logs.

## Tasks

### Task 1: Write the manifest

Create `/home/user/pod/nginx-pod.yaml` that defines a Pod with:

- name: `nginx-pod`
- labels: `app: web` and `tier: frontend`
- one container named `nginx` with image `{{IMAGE_NGINX}}` and container port `80`

### Task 2: Create the Pod

Create it with `kubectl apply -f` and wait until it is `Running`.

### Task 3: Generate some logs

Make at least one HTTP request to the Pod so it writes an access log line. You can, for example, use `kubectl port-forward` and `curl`, or run `kubectl exec nginx-pod -- curl -s localhost`.

### Task 4: Record what you see

Create `/home/user/pod/pod-info.txt` with:

```
status=<the Pod's phase, as shown in the STATUS column>
ip=<the Pod's IP address>
node=<the node it runs on>
labels=<its labels as key=value pairs, comma separated, sorted by key>
```

Save its logs to `/home/user/pod/nginx-pod.log`.

## Notes

- Leave the Pod running when you submit.

## Expected outcome

A running Pod `nginx-pod` with the two labels, a file describing its status, IP, node and labels, and its logs containing your request.
