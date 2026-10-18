#!/bin/bash
# Writes shuffled components, roles and steps.
set -euo pipefail
dir=/home/user/architecture
rm -rf "$dir" && mkdir -p "$dir"
python3 - "$dir" "$LAB_CONTEXT_FILE" <<'PY'
import json, random, sys
d, ctx_file = sys.argv[1], sys.argv[2]
components = [
    ("kubectl", "client", "A command line client that sends requests to the API server."),
    ("API server", "control-plane", "The front door of the cluster: it validates requests and is the only component that talks to etcd."),
    ("etcd", "control-plane", "A consistent key-value store that holds the whole cluster state."),
    ("scheduler", "control-plane", "Picks a node for every new pod that does not have one yet."),
    ("controller manager", "control-plane", "Runs control loops that make the actual state match the desired state, for example by creating pods for a ReplicaSet."),
    ("kubelet", "node", "An agent on each node that starts the pod's containers and reports their status."),
]
decoys = [
    "Balances HTTP traffic from the internet across the nodes.",
    "Builds container images from Dockerfiles.",
]
random.shuffle(components)
roles = [c[2] for c in components] + decoys
random.shuffle(roles)
steps = [
    "kubectl sends the Deployment to the API server.",
    "The API server validates the Deployment and stores it in etcd.",
    "The controller manager sees the new Deployment and creates a ReplicaSet and its pods.",
    "The scheduler assigns each new pod to a node.",
    "The kubelet on that node starts the containers through the container runtime.",
    "The kubelet reports the running pod's status back to the API server.",
]
order = list(range(len(steps)))
random.shuffle(order)
with open(f"{d}/components.txt", "w") as fh:
    for i, c in enumerate(components, 1):
        fh.write(f"C{i}: {c[0]}\n")
with open(f"{d}/roles.txt", "w") as fh:
    for i, r in enumerate(roles, 1):
        fh.write(f"R{i}: {r}\n")
with open(f"{d}/steps.txt", "w") as fh:
    for i, s in enumerate(order, 1):
        fh.write(f"S{i}: {steps[s]}\n")
ctx = {
    "roles": {f"C{i}": f"R{roles.index(c[2]) + 1}" for i, c in enumerate(components, 1)},
    "placement": {f"C{i}": c[1] for i, c in enumerate(components, 1)},
    "flow": [f"S{order.index(s) + 1}" for s in range(len(steps))],
}
json.dump(ctx, open(ctx_file, "w"))
PY
chown -R user:user "$dir"
