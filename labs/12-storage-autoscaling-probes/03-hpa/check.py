import os
import re

from labcheck import Checker, context, ensure, k8s, quote, read, wait_until

c = Checker()
ctx = context()


@c.test("cpu-app has CPU requests and limits")
def _():
    d = k8s("get deployment cpu-app")
    ensure(d, "Expected a deployment named cpu-app")
    ctr = next((x for x in d["spec"]["template"]["spec"]["containers"] if x["name"] == "podinfo"), None)
    ensure(ctr, "Expected a container named podinfo")
    res = ctr.get("resources") or {}
    ensure((res.get("requests") or {}).get("cpu") == "50m", f"Expected a CPU request of 50m but found {(res.get('requests') or {}).get('cpu')}")
    ensure((res.get("limits") or {}).get("cpu") == "200m", f"Expected a CPU limit of 200m but found {(res.get('limits') or {}).get('cpu')}")
    ensure(k8s("get service cpu-app"), "Expected a Service named cpu-app")
    return "CPU request 50m, limit 200m"


@c.test("cpu-app-hpa targets 50% CPU with 1 to 4 replicas")
def _():
    hpa = k8s("get hpa.v2.autoscaling cpu-app-hpa")
    ensure(hpa, "Expected a HorizontalPodAutoscaler named cpu-app-hpa")
    spec = hpa["spec"]
    ensure(spec["scaleTargetRef"].get("kind") == "Deployment" and spec["scaleTargetRef"].get("name") == "cpu-app", "Expected the HPA to scale the deployment cpu-app")
    ensure(spec.get("minReplicas") == 1 and spec.get("maxReplicas") == 4, f"Expected 1 to 4 replicas but found {spec.get('minReplicas')} to {spec.get('maxReplicas')}")
    cpu = [m for m in spec.get("metrics", []) if m.get("type") == "Resource" and m["resource"]["name"] == "cpu"]
    ensure(cpu and cpu[0]["resource"]["target"].get("averageUtilization") == 50, "Expected a CPU target of 50% average utilization")
    return "HPA spec is correct"


@c.test("the HPA reads the CPU utilization", requires=["cpu-app has CPU requests and limits", "cpu-app-hpa targets 50% CPU with 1 to 4 replicas"])
def _():
    def active():
        hpa = k8s("get hpa.v2.autoscaling cpu-app-hpa")
        cond = {x["type"]: x["status"] for x in hpa["status"].get("conditions", [])}
        metrics = hpa["status"].get("currentMetrics") or []
        return cond.get("ScalingActive") == "True" and any(m.get("resource", {}).get("current", {}).get("averageUtilization") is not None for m in metrics)

    ensure(wait_until(active, timeout=120, interval=5), "Expected the HPA to report a current CPU utilization (ScalingActive). Check kubectl describe hpa cpu-app-hpa.")
    return "The HPA has current CPU metrics"


@c.test("observed.txt shows a measured CPU percentage")
def _():
    text = read("/home/user/hpa/observed.txt")
    ensure("cpu-app-hpa" in text, "Expected the output of kubectl get hpa cpu-app-hpa")
    ensure(re.search(r"cpu:\s*\d+%/50%|\b\d+%/50%", text), "Expected a CPU percentage such as 'cpu: 87%/50%', not <unknown>. Save it again once the HPA shows a number.")
    return "A real CPU percentage was observed"


@c.test("prerequisites.txt names the two real prerequisites")
def _():
    got = sorted({x.strip().upper() for x in read("/home/user/hpa/prerequisites.txt").replace("\n", ",").split(",") if x.strip()})
    want = sorted(ctx.get("yes", []))
    ensure(len(got) == 2, f"Expected exactly 2 statement IDs but found {len(got)}")
    wrong = [g for g in got if g not in want]
    ensure(not wrong, f"{wrong[0] if wrong else ''} is not a prerequisite for CPU autoscaling")
    return f"{', '.join(got)} are the prerequisites"


c.run()
