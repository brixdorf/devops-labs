import os

from labcheck import Checker, ensure, json_in, k8s, read

IMAGE = os.environ.get("IMAGE_PODINFO", "")
c = Checker()


def backend_pods():
    return [p for p in k8s("get pods -l app=backend")["items"] if p["status"].get("phase") == "Running" and not p["metadata"].get("deletionTimestamp")]


def endpoint_ips():
    data = k8s("get endpointslices -l kubernetes.io/service-name=backend-svc")
    ips = set()
    for es in (data or {}).get("items", []):
        for ep in es.get("endpoints") or []:
            if ep.get("conditions", {}).get("ready", True):
                ips.update(ep.get("addresses", []))
    return ips


@c.test("backend runs 3 replicas of podinfo labelled app=backend")
def _():
    d = k8s("get deployment backend")
    ensure(d, "Expected a deployment named backend")
    ensure(d["spec"]["template"]["spec"]["containers"][0]["image"] == IMAGE, f"Expected image {IMAGE}")
    ensure(d["spec"]["template"]["metadata"].get("labels", {}).get("app") == "backend", "Expected the Pod label app=backend")
    ensure(d["status"].get("readyReplicas") == 3, f"Expected 3 ready replicas but found {d['status'].get('readyReplicas', 0)}")
    return "3 backend pods are ready"


@c.test("backend-svc is a ClusterIP Service from port 80 to 9898")
def _():
    s = k8s("get service backend-svc")
    ensure(s, "Expected a Service named backend-svc")
    spec = s["spec"]
    ensure(spec.get("type") == "ClusterIP", f"Expected type ClusterIP but found {spec.get('type')}")
    ensure(spec.get("selector") == {"app": "backend"}, f"Expected the selector app=backend but found {spec.get('selector')}")
    port = spec["ports"][0]
    ensure(port.get("port") == 80, f"Expected port 80 but found {port.get('port')}")
    ensure(str(port.get("targetPort")) == "9898", f"Expected targetPort 9898 but found {port.get('targetPort')}")
    return "ClusterIP, app=backend, 80 -> 9898"


@c.test("the endpoints are exactly the backend pods", requires=["backend runs 3 replicas of podinfo labelled app=backend", "backend-svc is a ClusterIP Service from port 80 to 9898"])
def _():
    want = {p["status"]["podIP"] for p in backend_pods()}
    got = endpoint_ips()
    canary = {p["status"].get("podIP") for p in k8s("get pods -l track=canary")["items"]}
    ensure(not (got & canary), "Expected no canary pod in the endpoints")
    ensure(got == want, f"Expected the endpoints {sorted(want)} but found {sorted(got)}")
    return f"Endpoints: {', '.join(sorted(got))}"


@c.test("endpoints.txt lists the endpoint addresses", requires=["the endpoints are exactly the backend pods"])
def _():
    text = read("/home/user/endpoints.txt")
    for ip in endpoint_ips():
        ensure(ip in text, f"Expected the endpoint {ip} in endpoints.txt")
    return "endpoints.txt shows all three addresses"


@c.test("backend-response.json came from a backend pod through the Service")
def _():
    text = read("/home/user/backend-response.json")
    data = json_in(text)
    host = data.get("hostname", "")
    names = {p["metadata"]["name"] for p in backend_pods()}
    ensure(host in names, f"Expected a podinfo response from one of the backend pods but found hostname {host or 'none'}")
    return f"Answered by {host}"


c.run()
