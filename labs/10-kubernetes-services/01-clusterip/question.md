## Objective

Pods come and go, and each new Pod gets a new IP address. A **Service** gives a group of Pods one stable name and address, and keeps track of the current Pod IPs (its **endpoints**) through a label selector. You will put a ClusterIP Service in front of a Deployment and verify that it selects exactly the right Pods.

## Tasks

### Task 1: Deploy the backend

Create a Deployment named `backend` with `3` replicas and image `{{IMAGE_PODINFO}}`. Its Pods must have the label `app=backend`. The application listens on port `9898`.

A second Deployment named `backend-canary` already exists. Its Pods have the labels `app=backend-canary` and `track=canary`. It must **not** receive traffic from your Service.

### Task 2: Create the Service

Create a Service:

- name: `backend-svc`
- type: `ClusterIP`
- selector: `app=backend`
- port `80`, forwarding to target port `9898`

### Task 3: Verify the endpoints

Check the Service's endpoints. Save the output of `kubectl get endpointslices -l kubernetes.io/service-name=backend-svc -o wide` to `/home/user/endpoints.txt`.

### Task 4: Call the Service

From a temporary Pod inside the cluster, request `http://backend-svc/` and save the response body to `/home/user/backend-response.json`, for example:

```
kubectl run curl-test --image={{IMAGE_BUSYBOX}} --rm -i --restart=Never -- wget -qO- http://backend-svc/ > /home/user/backend-response.json
```

## Notes

- A ClusterIP address is reachable only from inside the cluster, which is why the request runs in a Pod.

## Expected outcome

`backend-svc` selects exactly the three `backend` Pods, and the saved response comes from one of them.
