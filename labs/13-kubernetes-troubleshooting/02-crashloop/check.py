from labcheck import Checker, context, ensure, k8s, lines, quote, run, wait_until

ctx = context()
c = Checker()


def answers():
    got = {}
    for line in lines("/home/user/diagnosis.txt", "the file /home/user/diagnosis.txt"):
        if "=" in line:
            k, v = line.split("=", 1)
            got[k.strip()] = v.strip()
    return got


@c.test("diagnosis.txt records the status and exit code")
def _():
    got = answers()
    ensure(got.get("pod_status") == "CrashLoopBackOff", f"Expected pod_status=CrashLoopBackOff but found {quote(got.get('pod_status', ''))}")
    ensure(got.get("exit_code") == "3", f"Expected the exit code shown under Last State, not {quote(got.get('exit_code', ''))}")
    return "CrashLoopBackOff with exit code 3"


@c.test("diagnosis.txt names the root cause")
def _():
    got = answers().get("root_cause", "").upper()
    ensure(got == ctx["cause"], f"{got or 'Nothing'} is not the root cause. Read the logs again.")
    return f"The root cause is {got}"


@c.test("order-worker gets QUEUE_URL from the ConfigMap")
def _():
    d = k8s("get deployment order-worker")
    ensure(d and d["metadata"]["uid"] == ctx["uid"], "Expected the original order-worker deployment to be fixed in place")
    ctr = d["spec"]["template"]["spec"]["containers"][0]
    literal = [e for e in ctr.get("env", []) if e.get("name") == "QUEUE_URL" and "value" in e]
    ensure(not literal, "Expected QUEUE_URL to come from the ConfigMap, not to be typed into the Deployment")
    from_ref = any((e.get("valueFrom", {}).get("configMapKeyRef") or {}).get("name") == "order-worker-config" for e in ctr.get("env", []) if e.get("name") == "QUEUE_URL")
    from_all = any((e.get("configMapRef") or {}).get("name") == "order-worker-config" for e in ctr.get("envFrom", []))
    ensure(from_ref or from_all, "Expected QUEUE_URL to come from order-worker-config (envFrom or configMapKeyRef)")
    return "QUEUE_URL comes from order-worker-config"


@c.test("the worker runs and stays up", requires=["order-worker gets QUEUE_URL from the ConfigMap"])
def _():
    def healthy():
        d = k8s("get deployment order-worker")
        if d["status"].get("availableReplicas") != 1 or d["status"].get("updatedReplicas") != 1:
            return None
        pods = [p for p in k8s("get pods -l app=order-worker")["items"] if not p["metadata"].get("deletionTimestamp")]
        return pods if len(pods) == 1 and pods[0]["status"].get("phase") == "Running" else None

    pods = wait_until(healthy, timeout=60)
    ensure(pods, "Expected one running order-worker pod")
    status = pods[0]["status"]["containerStatuses"][0]
    ensure(status.get("ready") and status.get("restartCount", 0) == 0, "Expected the new pod to run without restarts")
    logs = run(["kubectl", "logs", pods[0]["metadata"]["name"]])
    ensure("worker started" in logs.out, "Expected 'worker started' in the logs")
    return "worker started and is running"


c.run()
