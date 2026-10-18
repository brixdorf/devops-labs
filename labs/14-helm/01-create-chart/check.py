import os
import re

from labcheck import Checker, context, ensure, lines, quote, read, run

D = "/home/user/charts"
CHART = f"{D}/webapp"
IMAGE = os.environ.get("IMAGE_NGINX", "")
REPO, TAG = IMAGE.rsplit(":", 1)
ctx = context()
c = Checker()


def chart_meta():
    r = run(["helm", "show", "chart", CHART], user="user")
    ensure(r.ok, f"Expected a valid chart at {CHART}: {r.err.strip()[:150]}")
    return {k: v.strip().strip('"') for k, v in re.findall(r"^(\w+):\s*(.*)$", r.out, re.M)}


@c.test("the chart webapp exists with templates")
def _():
    ensure(os.path.isfile(f"{CHART}/Chart.yaml"), f"Expected {CHART}/Chart.yaml. Create the chart with helm create.")
    ensure(os.path.isfile(f"{CHART}/values.yaml"), f"Expected {CHART}/values.yaml")
    ensure(os.path.isfile(f"{CHART}/templates/deployment.yaml"), f"Expected {CHART}/templates/deployment.yaml")
    return "webapp has Chart.yaml, values.yaml and templates/"


@c.test("Chart.yaml has the required metadata", requires=["the chart webapp exists with templates"])
def _():
    meta = chart_meta()
    ensure(meta.get("name") == "webapp", f"Expected name webapp but found {meta.get('name')!r}")
    ensure(meta.get("description") == "A simple web application", f"Expected the description 'A simple web application' but found {meta.get('description')!r}")
    ensure(meta.get("version") == "0.2.0", f"Expected version 0.2.0 but found {meta.get('version')!r}")
    ensure(meta.get("appVersion") == "1.0.0", f"Expected appVersion 1.0.0 but found {meta.get('appVersion')!r}")
    return "name, description, version and appVersion are set"


@c.test("the chart passes helm lint", requires=["the chart webapp exists with templates"])
def _():
    r = run(["helm", "lint", CHART], user="user")
    ensure(r.ok, f"Expected helm lint to pass: {r.text[-200:]}")
    return "helm lint reports no failures"


@c.test("the rendered Deployment uses the default values", requires=["the chart passes helm lint"])
def _():
    r = run(["helm", "template", "webapp", CHART], user="user")
    ensure(r.ok, f"Expected helm template to work: {r.err.strip()[:150]}")
    ensure(f'image: "{IMAGE}"' in r.out or f"image: {IMAGE}" in r.out, f"Expected the Deployment image {IMAGE}. Set image.repository and image.tag in values.yaml.")
    ensure("replicas: 2" in r.out, "Expected replicas: 2 from replicaCount in values.yaml")
    return f"Renders a Deployment with {IMAGE} and 2 replicas"


@c.test("webapp-rendered.yaml holds the rendered manifests")
def _():
    text = read(f"{D}/webapp-rendered.yaml")
    ensure("kind: Deployment" in text and "kind: Service" in text, "Expected the output of helm template with a Deployment and a Service")
    ensure(IMAGE in text, f"Expected the rendered Deployment to use {IMAGE}")
    return "The rendered output was saved"


@c.test("purpose.txt explains the chart parts")
def _():
    got = {}
    for line in lines(f"{D}/purpose.txt", f"the file {D}/purpose.txt"):
        if "=" in line:
            k, v = line.split("=", 1)
            got[k.strip().rstrip("/")] = v.strip().upper()
    for part in ["Chart.yaml", "values.yaml", "templates"]:
        ensure(part in got, f"Expected a line '{part}=...' in purpose.txt")
        ensure(got[part] == ctx[part], f"{got[part]} does not describe {part}")
    return "All three parts are explained correctly"


c.run()
