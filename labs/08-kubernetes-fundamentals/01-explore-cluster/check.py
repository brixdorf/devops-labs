import re

from labcheck import Checker, ensure, k8s, lines, quote, run

c = Checker()


def kv(path):
    out = {}
    for line in lines(path, f"the file {path}"):
        if "=" in line:
            k, v = line.split("=", 1)
            out[k.strip()] = v.strip()
    return out


def facts():
    node = k8s("get nodes")["items"][0]
    ns = sorted(i["metadata"]["name"] for i in k8s("get namespaces")["items"])
    pods = k8s("get pods -n kube-system")["items"]
    scs = k8s("get storageclass")["items"]
    default = next((s["metadata"]["name"] for s in scs if s["metadata"].get("annotations", {}).get("storageclass.kubernetes.io/is-default-class") == "true"), "")
    server = run(["kubectl", "config", "view", "--minify", "-o", "jsonpath={.clusters[0].cluster.server}"], user="user").out.strip()
    return {
        "node_name": node["metadata"]["name"],
        "kubernetes_version": node["status"]["nodeInfo"]["kubeletVersion"],
        "node_ip": next(a["address"] for a in node["status"]["addresses"] if a["type"] == "InternalIP"),
        "namespaces": ",".join(ns),
        "kube_system_pods": str(len(pods)),
        "default_storage_class": default,
        "api_server": server,
    }


real = facts()
FACTS = "/home/user/cluster-facts.txt"
for key in real:

    @c.test(f"cluster-facts.txt has the correct {key}")
    def _(key=key):
        got = kv(FACTS).get(key)
        ensure(got is not None, f"Expected a line '{key}=...' in {FACTS}")
        if key == "namespaces":
            got = ",".join(sorted(x.strip() for x in got.split(",") if x.strip()))
        if key == "kube_system_pods":
            want = int(real[key])
            ensure(got.isdigit() and abs(int(got) - want) <= 1, f"Expected about {want} pods but found {quote(got)}")
            return f"{key} is {got}"
        ensure(got.rstrip("/") == real[key], f"Expected {quote(real[key])} but found {quote(got)}")
        return f"{key} is {real[key]}"


COMMANDS = "/home/user/cluster-commands.txt"
PATTERNS = {
    "nodes_command": (r"kubectl\s+get\s+(nodes?|no)\b.*-o\s*wide", "kubectl get nodes -o wide"),
    "namespaces_command": (r"kubectl\s+get\s+(namespaces?|ns)\b", "kubectl get namespaces"),
    "pods_command": (r"kubectl\s+get\s+(pods?|po)\b.*(-n\s*|--namespace[= ])kube-system|kubectl\s+(-n\s*|--namespace[= ])kube-system\s+get\s+(pods?|po)\b", "kubectl get pods -n kube-system"),
    "cluster_info_command": (r"kubectl\s+cluster-info|kubectl\s+config\s+view", "kubectl cluster-info"),
}
for key, (pattern, example) in PATTERNS.items():

    @c.test(f"cluster-commands.txt records {key}")
    def _(key=key, pattern=pattern, example=example):
        got = kv(COMMANDS).get(key, "")
        ensure(got, f"Expected a line '{key}=...' in {COMMANDS}")
        ensure(re.search(pattern, got), f"Expected a command like {quote(example)} but found {quote(got)}")
        return f"{key} is {quote(got)}"


c.run()
