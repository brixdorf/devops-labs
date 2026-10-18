The IDs are shuffled per session; match them by meaning.

| Component | Role | Runs on |
| --- | --- | --- |
| kubectl | Command line client that sends requests to the API server | client |
| API server | Front door of the cluster: validates requests and is the only component that talks to etcd | control-plane |
| etcd | Consistent key-value store that holds the whole cluster state | control-plane |
| scheduler | Picks a node for every pod that has no node yet | control-plane |
| controller manager | Runs controllers that make the actual state match the desired state, for example creating ReplicaSets and pods | control-plane |
| kubelet | Agent on each node that starts the pod's containers and reports their status | node |

Request flow for `kubectl apply` of a Deployment:

1. kubectl sends the Deployment to the API server.
2. The API server validates it and stores it in etcd.
3. The controller manager notices the new Deployment and creates a ReplicaSet and pods.
4. The scheduler assigns each new pod to a node.
5. The kubelet on that node starts the containers through the container runtime.
6. The kubelet reports the pod status back to the API server.

Live facts:

```bash
kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}'   # https://k3s:6443
kubectl get nodes -o wide                                                    # VERSION and CONTAINER-RUNTIME
```
