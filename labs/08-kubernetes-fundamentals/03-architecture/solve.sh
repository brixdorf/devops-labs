#!/bin/bash
set -euo pipefail
cd /home/user/architecture
python3 - <<'PY'
import re
comps = dict(re.findall(r"^(C\d+): (.+)$", open("components.txt").read(), re.M))
roles = dict(re.findall(r"^(R\d+): (.+)$", open("roles.txt").read(), re.M))
steps = dict(re.findall(r"^(S\d+): (.+)$", open("steps.txt").read(), re.M))
key = {"kubectl": "command line client", "API server": "front door", "etcd": "key-value store",
       "scheduler": "Picks a node", "controller manager": "control loops", "kubelet": "agent on each node"}
place = {"kubectl": "client", "kubelet": "node"}
with open("roles-answer.txt", "w") as r, open("placement.txt", "w") as p:
    for cid, name in comps.items():
        rid = next(k for k, v in roles.items() if key[name] in v)
        r.write(f"{cid}={rid}\n")
        p.write(f"{cid}={place.get(name, 'control-plane')}\n")
order = ["kubectl sends", "validates", "controller manager sees", "scheduler assigns", "starts the containers", "reports"]
with open("flow.txt", "w") as f:
    for word in order:
        f.write(next(k for k, v in steps.items() if word in v) + "\n")
PY
server=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
printf 'api_server_port=%s\nkubelet_version=%s\ncontainer_runtime=%s\n' "${server##*:}" \
  "$(kubectl get nodes -o jsonpath='{.items[0].status.nodeInfo.kubeletVersion}')" \
  "$(kubectl get nodes -o jsonpath='{.items[0].status.nodeInfo.containerRuntimeVersion}')" > live.txt
