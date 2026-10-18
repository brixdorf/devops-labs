## Objective

A fresh Kubernetes cluster (k3s) is running for you, and `kubectl` in this terminal is already connected to it. Before deploying anything, get to know the cluster: its nodes, namespaces and the resources that are already running. Record what you find and the commands you used.

## Tasks

### Task 1: Inspect the cluster

Use `kubectl` to find:

- the name of the node and its Kubernetes version
- the internal IP address of the node
- the names of all namespaces
- how many pods run in the `kube-system` namespace
- the name of the default storage class
- the address of the API server that `kubectl` talks to

### Task 2: Record the facts

Create `/home/user/cluster-facts.txt` with exactly these lines:

```
node_name=<name of the node>
kubernetes_version=<version shown for the node, for example v1.30.0+k3s1>
node_ip=<internal IP of the node>
namespaces=<all namespace names, comma separated, in alphabetical order>
kube_system_pods=<number of pods in kube-system>
default_storage_class=<name of the default storage class>
api_server=<API server URL, for example https://example:6443>
```

### Task 3: Record the commands

Create `/home/user/cluster-commands.txt` with the commands you used:

```
nodes_command=<command that lists the nodes with their IP addresses>
namespaces_command=<command that lists the namespaces>
pods_command=<command that lists the pods in kube-system>
cluster_info_command=<command that shows the API server address>
```

## Notes

- Count every pod in `kube-system`, including completed ones.
- `kubectl` commands do not need `sudo` here.

## Expected outcome

Two files that describe the cluster and how you explored it.
