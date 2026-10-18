from labcheck import Checker, context, ensure, in_cluster, k8s, lines, quote

ctx = context()
c = Checker()


@c.test("diagnosis.txt explains the mismatch")
def _():
    got = {}
    for line in lines("/home/user/diagnosis.txt", "the file /home/user/diagnosis.txt"):
        if "=" in line:
            k, v = line.split("=", 1)
            got[k.strip()] = v.strip().replace(" ", "")
    ensure(got.get("endpoints_before") == "0", f"Expected endpoints_before=0 but found {quote(got.get('endpoints_before', ''))}")
    ensure(got.get("service_selector") == "app=front-end", f"Expected service_selector=app=front-end but found {quote(got.get('service_selector', ''))}")
    ensure(got.get("pod_labels") == "app=frontend", f"Expected pod_labels=app=frontend but found {quote(got.get('pod_labels', ''))}")
    return "The selector app=front-end matched no Pods labelled app=frontend"


@c.test("the Deployment and its labels are unchanged")
def _():
    d = k8s("get deployment frontend")
    ensure(d, "Expected the deployment frontend")
    ensure(str(d["metadata"]["generation"]) == ctx["generation"], "Expected the frontend deployment to be left unchanged; fix the Service instead")
    ensure(d["spec"]["template"]["metadata"]["labels"].get("app") == "frontend", "Expected the Pod label app=frontend to stay")
    return "frontend is unchanged"


@c.test("frontend-svc selects the frontend Pods")
def _():
    s = k8s("get service frontend-svc")
    ensure(s, "Expected the Service frontend-svc")
    sel = s["spec"].get("selector") or {}
    labels = k8s("get deployment frontend")["spec"]["template"]["metadata"]["labels"]
    ensure(sel and all(labels.get(k) == v for k, v in sel.items()), f"Expected the selector to match the frontend Pod labels but it is {sel}")
    pods = {p["status"].get("podIP") for p in k8s("get pods -l app=frontend")["items"]}
    data = k8s("get endpointslices -l kubernetes.io/service-name=frontend-svc")
    eps = {a for es in data["items"] for ep in es.get("endpoints") or [] for a in ep.get("addresses", [])}
    ensure(eps == pods, f"Expected the endpoints {sorted(pods)} but found {sorted(eps) or 'none'}")
    return f"Endpoints: {', '.join(sorted(eps))}"


@c.test("requests through frontend-svc work", requires=["frontend-svc selects the frontend Pods"])
def _():
    r = in_cluster("wget -qO- -T 5 http://frontend-svc/")
    ensure(r.ok and "Welcome to nginx" in r.out, f"Expected the Nginx page through the Service but got {quote(r.text, 120)}")
    return "The Service answers"


c.run()
