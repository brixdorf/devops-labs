import re
from urllib.parse import urlparse

from labcheck import Checker, context, ensure, k8s, lines, quote, run

D = "/home/user/architecture"
ctx = context()
c = Checker()


def pairs(path, pattern):
    out = {}
    for line in lines(path, f"the file {path}"):
        m = re.fullmatch(pattern, line.strip(), re.I)
        ensure(m, f"Unexpected line {quote(line)} in {path}")
        out[m.group(1).upper()] = m.group(2)
    return out


@c.test("roles-answer.txt matches every component to its role")
def _():
    got = pairs(f"{D}/roles-answer.txt", r"(C\d+)\s*=\s*(R\d+)")
    for comp, role in sorted(ctx["roles"].items()):
        ensure(comp in got, f"Expected an answer for {comp}")
        ensure(got[comp].upper() == role, f"{comp} does not have role {got[comp].upper()}. Read its role again.")
    return "All six roles are correct"


@c.test("placement.txt places every component correctly")
def _():
    got = pairs(f"{D}/placement.txt", r"(C\d+)\s*=\s*(control-plane|node|client)")
    for comp, place in sorted(ctx["placement"].items()):
        ensure(comp in got, f"Expected an answer for {comp}")
        ensure(got[comp].lower() == place, f"{comp} does not run on {got[comp].lower()}")
    return "Every component is placed correctly"


@c.test("flow.txt orders the steps of a kubectl apply")
def _():
    got = [l.strip().upper() for l in lines(f"{D}/flow.txt", f"the file {D}/flow.txt")]
    ensure(len(got) == len(ctx["flow"]), f"Expected {len(ctx['flow'])} step IDs but found {len(got)}")
    for i, (have, want) in enumerate(zip(got, ctx["flow"]), 1):
        ensure(have == want, f"Step {i} is not {have}. Think about which component acts first.")
    return "The request flow is in the right order"


@c.test("live.txt matches this cluster")
def _():
    got = {}
    for line in lines(f"{D}/live.txt", f"the file {D}/live.txt"):
        if "=" in line:
            k, v = line.split("=", 1)
            got[k.strip()] = v.strip()
    server = run(["kubectl", "config", "view", "--minify", "-o", "jsonpath={.clusters[0].cluster.server}"], user="user").out.strip()
    info = k8s("get nodes")["items"][0]["status"]["nodeInfo"]
    want = {
        "api_server_port": str(urlparse(server).port),
        "kubelet_version": info["kubeletVersion"],
        "container_runtime": info["containerRuntimeVersion"],
    }
    for k, v in want.items():
        ensure(k in got, f"Expected a line '{k}=...' in live.txt")
        ensure(got[k] == v, f"Expected {k}={v} but found {quote(got[k])}")
    return f"API port {want['api_server_port']}, kubelet {want['kubelet_version']}"


c.run()
