import os

from labcheck import Checker, ensure, k8s, quote, read

c = Checker()


def container(deploy, name):
    d = k8s(f"get deployment {deploy}")
    ensure(d, f"Expected a deployment named {deploy}")
    ctr = next((x for x in d["spec"]["template"]["spec"]["containers"] if x["name"] == name), None)
    ensure(ctr, f"Expected a container named {name} in {deploy}")
    return d, ctr


def pods(app):
    return [p for p in k8s(f"get pods -l app={app}")["items"] if not p["metadata"].get("deletionTimestamp")]


def ready(pod):
    return any(cnd["type"] == "Ready" and cnd["status"] == "True" for cnd in pod["status"].get("conditions", []))


@c.test("probe-demo has the readiness and liveness probes")
def _():
    d, ctr = container("probe-demo", "podinfo")
    ensure(d["spec"]["replicas"] == 2, f"Expected 2 replicas but found {d['spec']['replicas']}")
    ensure(ctr["image"] == os.environ.get("IMAGE_PODINFO"), f"Expected image {os.environ.get('IMAGE_PODINFO')}")
    rp = ctr.get("readinessProbe") or {}
    lp = ctr.get("livenessProbe") or {}
    ensure((rp.get("httpGet") or {}).get("path") == "/readyz" and str(rp["httpGet"].get("port")) == "9898", "Expected a readiness probe: HTTP GET /readyz on port 9898")
    ensure(rp.get("periodSeconds") == 3, f"Expected the readiness probe every 3 seconds but found {rp.get('periodSeconds')}")
    ensure((lp.get("httpGet") or {}).get("path") == "/healthz" and str(lp["httpGet"].get("port")) == "9898", "Expected a liveness probe: HTTP GET /healthz on port 9898")
    ensure(lp.get("periodSeconds") == 5, f"Expected the liveness probe every 5 seconds but found {lp.get('periodSeconds')}")
    return "Both HTTP probes are configured"


@c.test("probe-svc selects the probe-demo pods")
def _():
    s = k8s("get service probe-svc")
    ensure(s, "Expected a Service named probe-svc")
    ensure(s["spec"].get("selector") == {"app": "probe-demo"}, f"Expected the selector app=probe-demo but found {s['spec'].get('selector')}")
    ensure(str(s["spec"]["ports"][0].get("targetPort")) == "9898", "Expected targetPort 9898")
    return "probe-svc targets port 9898 of probe-demo"


@c.test("one pod is running but not ready and gets no traffic", requires=["probe-demo has the readiness and liveness probes", "probe-svc selects the probe-demo pods"])
def _():
    ps = pods("probe-demo")
    running = [p for p in ps if p["status"].get("phase") == "Running"]
    ensure(len(running) == 2, f"Expected 2 running probe-demo pods but found {len(running)}")
    not_ready = [p for p in running if not ready(p)]
    ensure(len(not_ready) == 1, f"Expected exactly 1 pod that is not ready but found {len(not_ready)}")
    data = k8s("get endpointslices -l kubernetes.io/service-name=probe-svc")
    serving = {a for es in data["items"] for ep in es.get("endpoints") or [] if ep.get("conditions", {}).get("ready") for a in ep.get("addresses", [])}
    ensure(not_ready[0]["status"]["podIP"] not in serving, "Expected the not-ready pod to be removed from the ready endpoints")
    ok = [p for p in running if ready(p)]
    ensure(ok and ok[0]["status"]["podIP"] in serving, "Expected the ready pod to keep receiving traffic")
    restarts = not_ready[0]["status"]["containerStatuses"][0]["restartCount"]
    ensure(restarts == 0, "Expected readiness failures not to restart the container")
    return f"{not_ready[0]['metadata']['name']} is not ready and out of the Service"


@c.test("not-ready-pod.txt names that pod", requires=["one pod is running but not ready and gets no traffic"])
def _():
    name = read("/home/user/probes/not-ready-pod.txt").strip()
    want = [p["metadata"]["name"] for p in pods("probe-demo") if not ready(p)][0]
    ensure(name == want, f"Expected {want} but found {quote(name)}")
    return f"{name} is recorded"


@c.test("liveness-demo has the exec liveness probe")
def _():
    d, ctr = container("liveness-demo", "app")
    lp = ctr.get("livenessProbe") or {}
    ensure((lp.get("exec") or {}).get("command") == ["cat", "/tmp/healthy"], f"Expected the probe command ['cat', '/tmp/healthy'] but found {(lp.get('exec') or {}).get('command')}")
    ensure(lp.get("periodSeconds") == 5 and lp.get("failureThreshold") == 2, "Expected periodSeconds 5 and failureThreshold 2")
    return "The exec probe is configured"


@c.test("the liveness probe restarted the container", requires=["liveness-demo has the exec liveness probe"])
def _():
    ps = pods("liveness-demo")
    ensure(ps, "Expected a liveness-demo pod")
    count = ps[0]["status"]["containerStatuses"][0]["restartCount"]
    ensure(count >= 1, f"Expected at least 1 restart but found {count}. Delete /tmp/healthy and wait.")
    events = k8s(f"get events --field-selector involvedObject.name={ps[0]['metadata']['name']}")["items"]
    ensure(any("Liveness probe failed" in e.get("message", "") for e in events), "Expected 'Liveness probe failed' events for the pod")
    got = read("/home/user/probes/restarts.txt").strip()
    ensure(got.isdigit() and 1 <= int(got) <= count, f"Expected restarts.txt to hold the restart count you saw (1 to {count}) but found {quote(got)}")
    return f"The container restarted {count} time(s) after liveness failures"


c.run()
