import os

from labcheck import Checker, ensure, k8s, lines, quote, read, run

IMAGE = os.environ.get("IMAGE_NGINX", "")
D = "/home/user/pod"
c = Checker()


def pod():
    return k8s("get pod nginx-pod")


@c.test("the manifest defines the Pod")
def _():
    path = f"{D}/nginx-pod.yaml"
    ensure(os.path.isfile(path), f"Expected {path} but it was not found")
    r = run(["kubectl", "apply", "--dry-run=client", "-f", path, "-o", "json"])
    ensure(r.ok, f"Expected a valid manifest: {r.err.strip()[:160]}")
    import json

    obj = json.loads(r.out)
    ensure(obj.get("kind") == "Pod" and obj["metadata"].get("name") == "nginx-pod", "Expected kind Pod named nginx-pod in the manifest")
    return "nginx-pod.yaml is a valid Pod manifest"


@c.test("nginx-pod is running with the right labels and container")
def _():
    p = pod()
    ensure(p, "Expected a Pod named nginx-pod in the default namespace")
    ensure(p["status"].get("phase") == "Running", f"Expected the Pod to be Running but it is {p['status'].get('phase')}")
    labels = p["metadata"].get("labels", {})
    ensure(labels.get("app") == "web" and labels.get("tier") == "frontend", f"Expected labels app=web and tier=frontend but found {labels}")
    ctr = p["spec"]["containers"][0]
    ensure(ctr["name"] == "nginx", f"Expected the container to be named nginx but found {ctr['name']}")
    ensure(ctr["image"] == IMAGE, f"Expected image {IMAGE} but found {ctr['image']}")
    ensure(80 in [x.get("containerPort") for x in ctr.get("ports", [])], "Expected container port 80")
    return "nginx-pod is Running with app=web and tier=frontend"


@c.test("pod-info.txt matches the Pod", requires=["nginx-pod is running with the right labels and container"])
def _():
    got = {}
    for line in lines(f"{D}/pod-info.txt", f"the file {D}/pod-info.txt"):
        if "=" in line:
            k, v = line.split("=", 1)
            got[k.strip()] = v.strip()
    p = pod()
    labels = ",".join(f"{k}={v}" for k, v in sorted(p["metadata"]["labels"].items()))
    want = {"status": "Running", "ip": p["status"]["podIP"], "node": p["spec"]["nodeName"], "labels": labels}
    for k, v in want.items():
        ensure(k in got, f"Expected a line '{k}=...' in pod-info.txt")
        value = ",".join(sorted(x.strip() for x in got[k].split(","))) if k == "labels" else got[k]
        ensure(value == v, f"Expected {k}={v} but found {quote(got[k])}")
    return "Status, IP, node and labels are correct"


@c.test("nginx-pod.log holds the Pod's logs with a request")
def _():
    text = read(f"{D}/nginx-pod.log")
    ensure('"GET / HTTP/1.1" 200' in text, "Expected an access log line for a GET request. Send a request, then save the logs again.")
    return "The log shows your request"


c.run()
