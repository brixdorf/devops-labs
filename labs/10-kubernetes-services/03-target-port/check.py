from labcheck import Checker, ensure, json_in, k8s, lines, quote, read

c = Checker()


def endpoints():
    data = k8s("get endpointslices -l kubernetes.io/service-name=payments-svc")
    out = []
    for es in (data or {}).get("items", []):
        ports = [p.get("port") for p in es.get("ports") or []]
        for ep in es.get("endpoints") or []:
            for addr in ep.get("addresses", []):
                out += [f"{addr}:{p}" for p in ports]
    return out


@c.test("payments-svc maps port 8080 to the named port http")
def _():
    s = k8s("get service payments-svc")
    ensure(s, "Expected a Service named payments-svc")
    spec = s["spec"]
    ensure(spec.get("type", "ClusterIP") == "ClusterIP", f"Expected a ClusterIP Service but found {spec.get('type')}")
    ensure(spec.get("selector") == {"app": "payments"}, f"Expected the selector app=payments but found {spec.get('selector')}")
    port = spec["ports"][0]
    ensure(port.get("port") == 8080, f"Expected port 8080 but found {port.get('port')}")
    ensure(port.get("targetPort") == "http", f"Expected targetPort to be the port name http but found {port.get('targetPort')!r}")
    return "8080 -> http"


@c.test("the endpoints resolve to container port 9898", requires=["payments-svc maps port 8080 to the named port http"])
def _():
    eps = endpoints()
    ensure(eps, "Expected the Service to have endpoints")
    ensure(all(e.endswith(":9898") for e in eps), f"Expected every endpoint on port 9898 but found {eps}")
    return f"Endpoints: {', '.join(eps)}"


@c.test("payments-version.json came from the application")
def _():
    text = read("/home/user/payments-version.json")
    data = json_in(text)
    ensure("version" in data and "commit" in data, f"Expected the JSON from /version but found {quote(text, 100)}")
    return f"The app answered with version {data['version']}"


@c.test("port-mapping.txt explains the mapping", requires=["the endpoints resolve to container port 9898"])
def _():
    got = {}
    for line in lines("/home/user/port-mapping.txt", "the file /home/user/port-mapping.txt"):
        if "=" in line:
            k, v = line.split("=", 1)
            got[k.strip()] = v.strip()
    ensure(got.get("service_port") == "8080", f"Expected service_port=8080 but found {quote(got.get('service_port', ''))}")
    ensure(got.get("target_port") == "9898", f"Expected target_port=9898 but found {quote(got.get('target_port', ''))}")
    ensure(got.get("endpoint") in endpoints(), f"Expected endpoint to be one of {endpoints()} but found {quote(got.get('endpoint', ''))}")
    return "The mapping is explained correctly"


c.run()
