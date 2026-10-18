import os

from labcheck import Checker, ensure, k8s, lines, quote, read

IMAGE = os.environ.get("IMAGE_PODINFO", "")
D = "/home/user/inspect"
c = Checker()


def deploy():
    return k8s("get deployment hello-web -n demo")


def pods():
    data = k8s("get pods -n demo")
    items = data["items"] if data else []
    return [p for p in items if p["metadata"]["name"].startswith("hello-web-")]


@c.test("the namespace demo exists")
def _():
    ensure(k8s("get namespace demo"), "Expected a namespace named demo")
    return "demo exists"


@c.test("hello-web runs the right image with 2 replicas on port 9898", requires=["the namespace demo exists"])
def _():
    d = deploy()
    ensure(d, "Expected a deployment named hello-web in the demo namespace")
    spec = d["spec"]
    ensure(spec.get("replicas") == 2, f"Expected 2 replicas but found {spec.get('replicas')}")
    container = spec["template"]["spec"]["containers"][0]
    ensure(container["image"] in (IMAGE, f"docker.io/{IMAGE}"), f"Expected image {IMAGE} but found {container['image']}")
    ports = [p.get("containerPort") for p in container.get("ports", [])]
    ensure(9898 in ports, f"Expected container port 9898 but found {ports or 'none'}")
    return "Deployment spec is correct"


@c.test("both replicas are available", requires=["hello-web runs the right image with 2 replicas on port 9898"])
def _():
    status = deploy()["status"]
    ready = status.get("availableReplicas", 0)
    ensure(ready == 2, f"Expected 2 available replicas but found {ready}")
    return "2/2 replicas are available"


@c.test("pods.txt is a wide listing of the pods")
def _():
    text = read(f"{D}/pods.txt")
    ensure("NODE" in text and "IP" in text, "Expected the wide format (-o wide) with IP and NODE columns")
    for p in pods():
        ensure(p["metadata"]["name"] in text, f"Expected the pod {p['metadata']['name']} in pods.txt")
    return "pods.txt lists the pods with IP and node"


@c.test("describe.txt describes the deployment")
def _():
    text = read(f"{D}/describe.txt")
    ensure("Name:" in text and "hello-web" in text and "Replicas:" in text, "Expected the output of kubectl describe deployment hello-web")
    ensure(IMAGE in text, f"Expected the image {IMAGE} in the description")
    return "describe.txt shows the deployment details"


@c.test("logs.txt holds the application logs")
def _():
    text = read(f"{D}/logs.txt")
    ensure("9898" in text and ("Starting podinfo" in text or "podinfo" in text), "Expected the startup logs of a hello-web pod")
    return "logs.txt contains the startup logs"


@c.test("summary.txt matches the cluster", requires=["both replicas are available"])
def _():
    got = {}
    for line in lines(f"{D}/summary.txt", "the file /home/user/inspect/summary.txt"):
        if "=" in line:
            k, v = line.split("=", 1)
            got[k.strip()] = v.strip()
    node = pods()[0]["spec"]["nodeName"]
    want = {"pod_count": "2", "image": IMAGE, "node": node, "log_contains_port": "9898"}
    for k, v in want.items():
        ensure(k in got, f"Expected a line '{k}=...' in summary.txt")
        ok = got[k] == v or (k == "image" and got[k] == f"docker.io/{v}")
        ensure(ok, f"Expected {k}={v} but found {quote(got[k])}")
    return "Pod count, image, node and port are correct"


c.run()
