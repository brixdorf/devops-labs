## Objective

A cluster diagram shows boxes for the API server, scheduler, controller manager, etcd, kubelet and kubectl, with arrows between them. Instead of drawing it, you will build the same picture as structured answers: what each component does, where it runs, and in which order the components act when you create a Deployment.

The files you need are in `/home/user/architecture/`:

- `components.txt`: the six components, `C1` to `C6`
- `roles.txt`: role descriptions with IDs `R1`, `R2`, ... (more roles than components, so some are decoys)
- `steps.txt`: the steps that happen when you run `kubectl apply` for a Deployment, in a shuffled order, with IDs `S1`, `S2`, ...

## Tasks

### Task 1: Match each component to its role

Create `/home/user/architecture/roles-answer.txt` with one line per component, `C1=R4` style.

### Task 2: Place each component

Create `/home/user/architecture/placement.txt` with one line per component, saying where it runs:

- `control-plane`: part of the cluster's control plane
- `node`: runs on every worker node
- `client`: runs on the user's machine, outside the cluster

Format: `C1=control-plane`.

### Task 3: Order the request flow

Create `/home/user/architecture/flow.txt` with the step IDs from `steps.txt` in the order they happen, one per line.

### Task 4: Connect it to this cluster

Using `kubectl`, create `/home/user/architecture/live.txt` with:

```
api_server_port=<TCP port of the API server that kubectl talks to>
kubelet_version=<kubelet version reported for the node>
container_runtime=<container runtime reported for the node, for example containerd://1.7.0>
```

## Notes

- k3s packages the control plane components into one process, but each one still does the same job as in any Kubernetes cluster.

## Expected outcome

Four answer files that together describe the cluster architecture and how a request flows through it.
