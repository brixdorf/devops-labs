import json

from labcheck import Checker, ensure, k8s, read, run

WANT = {"APP_COLOR": "teal", "APP_MODE": "staging", "MAX_UPLOAD_MB": "25"}
c = Checker()


@c.test("app-config holds the three settings")
def _():
    cm = k8s("get configmap app-config")
    ensure(cm, "Expected a ConfigMap named app-config")
    data = cm.get("data", {})
    for k, v in WANT.items():
        ensure(data.get(k) == v, f"Expected {k}={v} in app-config but found {data.get(k)!r}")
    return "APP_COLOR, APP_MODE and MAX_UPLOAD_MB are set"


@c.test("config-demo takes its environment from app-config", requires=["app-config holds the three settings"])
def _():
    d = k8s("get deployment config-demo")
    ensure(d, "Expected a deployment named config-demo")
    ctr = next((x for x in d["spec"]["template"]["spec"]["containers"] if x["name"] == "app"), None)
    ensure(ctr, "Expected a container named app")
    from_all = any((e.get("configMapRef") or {}).get("name") == "app-config" for e in ctr.get("envFrom", []))
    refs = {e["name"] for e in ctr.get("env", []) if (e.get("valueFrom", {}).get("configMapKeyRef") or {}).get("name") == "app-config"}
    literal = [e["name"] for e in ctr.get("env", []) if e.get("name") in WANT and "value" in e]
    ensure(not literal, f"Expected the values to come from the ConfigMap, but {literal[0] if literal else ''} is written into the Deployment")
    ensure(from_all or set(WANT) <= refs, "Expected envFrom configMapRef app-config, or a configMapKeyRef for every key")
    return "The container reads its settings from app-config"


@c.test("the running pod has the values", requires=["config-demo takes its environment from app-config"])
def _():
    r = run(["kubectl", "exec", "deploy/config-demo", "-c", "app", "--", "env"], timeout=60)
    ensure(r.ok, f"Expected a running config-demo pod: {r.err.strip()[:150]}")
    env = dict(l.split("=", 1) for l in r.out.splitlines() if "=" in l)
    for k, v in WANT.items():
        ensure(env.get(k) == v, f"Expected {k}={v} inside the pod but found {env.get(k)!r}")
    return "The pod sees all three values"


@c.test("config-check.txt shows the values")
def _():
    text = read("/home/user/config-check.txt")
    for k, v in WANT.items():
        ensure(f"{k}={v}" in text, f"Expected {k}={v} in config-check.txt")
    return "config-check.txt is correct"


c.run()
