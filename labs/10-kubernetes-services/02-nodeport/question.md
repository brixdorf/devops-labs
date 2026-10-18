## Objective

A ClusterIP Service is reachable only inside the cluster. A **NodePort** Service also opens a port on every node, so clients outside the cluster can reach the application at `<node address>:<node port>`. In this lab the cluster node is reachable from your terminal as `k3s`.

## Tasks

### Task 1: Deploy the application

Create a Deployment named `storefront` with `2` replicas and image `{{IMAGE_NGINX}}`, container port `80`.

### Task 2: Create a NodePort Service

Create a Service:

- name: `storefront-np`
- type: `NodePort`
- selecting the `storefront` Pods
- port `80`, target port `80`
- node port `30080`

### Task 3: Access it from outside the cluster

From this terminal (which is outside the cluster), request `http://k3s:30080/` with `curl` and save the response to `/home/user/nodeport-response.html`.

### Task 4: Record the address

Create `/home/user/nodeport.txt` with:

```
node_ip=<internal IP of the cluster node>
node_port=<the node port of storefront-np>
url=<a URL that reaches the app through the node IP and port, for example http://10.0.0.5:30000/>
```

## Notes

- Node ports must be in the range 30000 to 32767.

## Expected outcome

`storefront-np` exposes the app on node port 30080, and the saved response is the Nginx page fetched from outside the cluster.
