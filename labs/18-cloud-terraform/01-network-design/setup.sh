#!/bin/bash
set -euo pipefail
mkdir -p /home/user/cloud
python3 - "$LAB_CONTEXT_FILE" <<'PY'
import json, random, sys
hops = {
    "customer": "Customer's browser on the internet",
    "igw": "Internet gateway of the VPC",
    "lb": "Load balancer in the public subnet",
    "app": "Application server in the private subnet",
    "private_rt": "Route table of the private subnet (0.0.0.0/0 to the NAT gateway)",
    "nat": "NAT gateway in the public subnet",
    "update": "Update server on the internet",
    "db": "Database replica in another region",
}
keys = list(hops)
random.shuffle(keys)
ids = {k: f"H{i}" for i, k in enumerate(keys, 1)}
with open("/home/user/cloud/hops.txt", "w") as fh:
    for k in keys:
        fh.write(f"{ids[k]}: {hops[k]}\n")
ctx = {
    "inbound": [ids[k] for k in ["customer", "igw", "lb", "app"]],
    "outbound": [ids[k] for k in ["app", "private_rt", "nat", "igw", "update"]],
}
json.dump(ctx, open(sys.argv[1], "w"))
PY
chown -R user:user /home/user/cloud
rm -f /home/user/cloud/design.yaml /home/user/cloud/flow.txt
