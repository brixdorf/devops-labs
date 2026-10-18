## Objective

A Service's `port` is the port clients connect to; its `targetPort` is the port the container actually listens on. They do not have to be the same. A mismatch is a classic cause of "connection refused" errors, so it pays to understand the mapping.

The Deployment `payments` already runs in the cluster. Its container listens on port `9898` and the port is **named** `http` in the Pod spec.

## Tasks

### Task 1: Inspect the container port

Find the port number and port name of the `payments` container.

### Task 2: Create the Service

Create a ClusterIP Service:

- name: `payments-svc`
- selecting the `payments` Pods
- `port: 8080` (what clients use)
- `targetPort: http` (the **name** of the container port, not the number)

### Task 3: Prove the traffic arrives

From a temporary Pod inside the cluster, request `http://payments-svc:8080/version` and save the response body to `/home/user/payments-version.json`.

### Task 4: Explain the mapping

Create `/home/user/port-mapping.txt` with:

```
service_port=<port clients connect to>
target_port=<container port number that receives the traffic>
endpoint=<one endpoint as ip:port, as listed for the Service>
```

## Notes

- Using a port **name** as the target means the Service keeps working even if the container port number changes later.

## Expected outcome

`payments-svc` forwards port 8080 to the container's `http` port (9898), and the saved response came from the application.
