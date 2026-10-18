import os

from labcheck import Checker, ensure, http, k8s, lines, quote, read

IMAGE = os.environ.get("IMAGE_NGINX", "")
c = Checker()


@c.test("storefront runs 2 nginx replicas")
def _():
    d = k8s("get deployment storefront")
    ensure(d, "Expected a deployment named storefront")
    ensure(d["spec"]["template"]["spec"]["containers"][0]["image"] == IMAGE, f"Expected image {IMAGE}")
    ensure(d["status"].get("readyReplicas") == 2, f"Expected 2 ready replicas but found {d['status'].get('readyReplicas', 0)}")
    return "2 storefront pods are ready"


@c.test("storefront-np is a NodePort Service on node port 30080", requires=["storefront runs 2 nginx replicas"])
def _():
    s = k8s("get service storefront-np")
    ensure(s, "Expected a Service named storefront-np")
    spec = s["spec"]
    ensure(spec.get("type") == "NodePort", f"Expected type NodePort but found {spec.get('type')}")
    labels = k8s("get deployment storefront")["spec"]["template"]["metadata"]["labels"]
    sel = spec.get("selector") or {}
    ensure(sel and all(labels.get(k) == v for k, v in sel.items()), f"Expected the selector to match the storefront pods but found {sel}")
    port = spec["ports"][0]
    ensure(port.get("port") == 80 and str(port.get("targetPort")) == "80", "Expected port 80 to target port 80")
    ensure(port.get("nodePort") == 30080, f"Expected node port 30080 but found {port.get('nodePort')}")
    return "NodePort 30080 -> 80"


@c.test("http://k3s:30080 answers from outside the cluster", requires=["storefront-np is a NodePort Service on node port 30080"])
def _():
    status, body = http("http://k3s:30080/", timeout=10)
    ensure(status == 200 and "Welcome to nginx" in body, f"Expected the Nginx page from http://k3s:30080 but found HTTP {status}")
    return "The app answers on the node port"


@c.test("nodeport-response.html holds the page")
def _():
    ensure("Welcome to nginx" in read("/home/user/nodeport-response.html"), "Expected the Nginx welcome page in nodeport-response.html")
    return "The response was saved"


@c.test("nodeport.txt records a working address", requires=["storefront-np is a NodePort Service on node port 30080"])
def _():
    got = {}
    for line in lines("/home/user/nodeport.txt", "the file /home/user/nodeport.txt"):
        if "=" in line:
            k, v = line.split("=", 1)
            got[k.strip()] = v.strip()
    node = k8s("get nodes")["items"][0]
    ip = next(a["address"] for a in node["status"]["addresses"] if a["type"] == "InternalIP")
    ensure(got.get("node_ip") == ip, f"Expected node_ip={ip} but found {quote(got.get('node_ip', ''))}")
    ensure(got.get("node_port") == "30080", f"Expected node_port=30080 but found {quote(got.get('node_port', ''))}")
    url = got.get("url", "")
    ensure(ip in url and "30080" in url, f"Expected a URL with {ip} and 30080 but found {quote(url)}")
    status, body = http(url, timeout=10)
    ensure(status == 200, f"Expected the URL {url} to answer but found HTTP {status}")
    return f"{url} works"


c.run()
