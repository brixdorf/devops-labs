import json
import os

from labcheck import Checker, ensure, k8s, read, run

D = "/home/user/charts"
IMAGE = os.environ.get("IMAGE_NGINX", "")
REPO, TAG = IMAGE.rsplit(":", 1)
c = Checker()


@c.test("prod-values.yaml sets image, replicas and port")
def _():
    path = f"{D}/prod-values.yaml"
    ensure(os.path.isfile(path), f"Expected {path} but it was not found")
    r = run(["helm", "template", "shop", f"{D}/shop", "-f", path], user="user")
    ensure(r.ok, f"Expected the chart to render with prod-values.yaml: {r.err.strip()[:150]}")
    ensure(f'image: "{IMAGE}"' in r.out, f"Expected the rendered image {IMAGE}")
    ensure("replicas: 3" in r.out, "Expected replicas: 3")
    ensure("port: 8080" in r.out, "Expected the Service port 8080")
    return "The values render the expected manifests"


@c.test("the chart itself was not edited")
def _():
    text = read(f"{D}/shop/values.yaml")
    ensure("replicaCount: 1" in text and "port: 80\n" in text, "Expected shop/values.yaml to keep its defaults; put your settings in prod-values.yaml")
    return "The chart defaults are unchanged"


@c.test("rendered.yaml holds the rendered manifests")
def _():
    text = read(f"{D}/rendered.yaml")
    ensure(f'image: "{IMAGE}"' in text and "replicas: 3" in text and "port: 8080" in text, "Expected the output of helm template with your values")
    return "rendered.yaml shows the production settings"


@c.test("release shop is deployed in namespace shop")
def _():
    r = run(["helm", "status", "shop", "-n", "shop", "-o", "json"])
    ensure(r.ok, "Expected a Helm release named shop in the namespace shop")
    data = json.loads(r.out)
    ensure(data["info"]["status"] == "deployed", f"Expected status deployed but found {data['info']['status']}")
    vals = json.loads(run(["helm", "get", "values", "shop", "-n", "shop", "-o", "json"]).out) or {}
    ensure(vals.get("replicaCount") == 3 and (vals.get("service") or {}).get("port") == 8080, "Expected the release to use your values (replicaCount 3, service.port 8080)")
    return "shop is deployed with your values"


@c.test("the installed resources match", requires=["release shop is deployed in namespace shop"])
def _():
    d = k8s("get deployment shop -n shop")
    ensure(d, "Expected a deployment named shop in the namespace shop")
    ensure(d["spec"]["template"]["spec"]["containers"][0]["image"] == IMAGE, f"Expected image {IMAGE}")
    ensure(d["status"].get("readyReplicas") == 3, f"Expected 3 ready replicas but found {d['status'].get('readyReplicas', 0)}")
    s = k8s("get service shop -n shop")
    ensure(s and s["spec"]["ports"][0]["port"] == 8080, "Expected the Service shop on port 8080")
    return "3 ready replicas and a Service on 8080"


@c.test("installed-values.txt shows the release values")
def _():
    text = read(f"{D}/installed-values.txt")
    ensure("replicaCount: 3" in text and "8080" in text, "Expected the output of helm get values shop -n shop")
    return "installed-values.txt is correct"


c.run()
