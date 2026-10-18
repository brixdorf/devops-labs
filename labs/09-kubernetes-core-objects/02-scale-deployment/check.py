import os

from labcheck import Checker, ensure, k8s, lines, quote

IMAGE = os.environ.get("IMAGE_PODINFO", "")
c = Checker()


def events():
    data = k8s("get events --field-selector involvedObject.kind=Deployment,involvedObject.name=shop-api")
    return [e.get("message", "") for e in (data or {}).get("items", [])]


@c.test("shop-api exists with the right image")
def _():
    d = k8s("get deployment shop-api")
    ensure(d, "Expected a deployment named shop-api in the default namespace")
    image = d["spec"]["template"]["spec"]["containers"][0]["image"]
    ensure(image == IMAGE, f"Expected image {IMAGE} but found {image}")
    return f"shop-api uses {IMAGE}"


@c.test("shop-api now runs 2 ready replicas", requires=["shop-api exists with the right image"])
def _():
    d = k8s("get deployment shop-api")
    ensure(d["spec"]["replicas"] == 2, f"Expected the desired replicas to be 2 but found {d['spec']['replicas']}")
    ready = d["status"].get("readyReplicas", 0)
    ensure(ready == 2, f"Expected 2 ready replicas but found {ready}")
    pods = [p for p in k8s("get pods -l app=shop-api")["items"] if not p["metadata"].get("deletionTimestamp")]
    ensure(len(pods) == 2, f"Expected 2 pods but found {len(pods)}")
    return "2 of 2 replicas are ready"


@c.test("the deployment was scaled up to 5", requires=["shop-api exists with the right image"])
def _():
    msgs = events()
    ensure(any("Scaled up" in m and "to 5" in m for m in msgs), "Expected a 'Scaled up replica set ... to 5' event for shop-api")
    return "Found the scale-up to 5"


@c.test("the deployment was scaled back down to 2", requires=["the deployment was scaled up to 5"])
def _():
    msgs = events()
    ensure(any("Scaled down" in m and ("to 2" in m) for m in msgs), "Expected a 'Scaled down replica set ... to 2' event for shop-api")
    return "Found the scale-down to 2"


@c.test("replicas.txt records 2, 5 and 2")
def _():
    got = [l.strip() for l in lines("/home/user/replicas.txt", "the file /home/user/replicas.txt")]
    ensure(got == ["2", "5", "2"], f"Expected the lines 2, 5, 2 but found {quote(', '.join(got))}")
    return "replicas.txt shows 2, 5, 2"


c.run()
