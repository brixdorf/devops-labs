import os
import re

from labcheck import Checker, ensure, k8s, lines, quote, read

V1 = os.environ.get("IMAGE_PODINFO_PREVIOUS", "")
V2 = os.environ.get("IMAGE_PODINFO", "")
D = "/home/user/rollout"
c = Checker()


def deploy():
    return k8s("get deployment catalog")


def replicasets():
    data = k8s("get replicasets -l app=catalog")
    return (data or {}).get("items", [])


def revisions(text):
    return [int(m) for m in re.findall(r"^\s*(\d+)\s", text, re.M)]


@c.test("catalog exists with 3 replicas and a podinfo container")
def _():
    d = deploy()
    ensure(d, "Expected a deployment named catalog in the default namespace")
    ensure(d["spec"]["replicas"] == 3, f"Expected 3 replicas but found {d['spec']['replicas']}")
    names = [x["name"] for x in d["spec"]["template"]["spec"]["containers"]]
    ensure("podinfo" in names, f"Expected a container named podinfo but found {names}")
    return "catalog has 3 replicas"


@c.test("version 2 was rolled out", requires=["catalog exists with 3 replicas and a podinfo container"])
def _():
    images = [rs["spec"]["template"]["spec"]["containers"][0]["image"] for rs in replicasets()]
    ensure(V2 in images, f"Expected a ReplicaSet with {V2}, created by the rolling update")
    ensure(V1 in images, f"Expected a ReplicaSet with {V1} from the first deployment")
    return "ReplicaSets for both versions exist"


@c.test("the deployment was rolled back to version 1", requires=["version 2 was rolled out"])
def _():
    d = deploy()
    image = d["spec"]["template"]["spec"]["containers"][0]["image"]
    ensure(image == V1, f"Expected the deployment to use {V1} after the rollback but it uses {image}")
    rev = int(d["metadata"].get("annotations", {}).get("deployment.kubernetes.io/revision", "0"))
    ensure(rev >= 3, f"Expected revision 3 or higher after a rollback but found {rev}")
    return f"catalog is back on version 1 at revision {rev}"


@c.test("all 3 pods are ready on version 1", requires=["the deployment was rolled back to version 1"])
def _():
    status = deploy()["status"]
    ensure(status.get("updatedReplicas") == 3 and status.get("readyReplicas") == 3 and status.get("replicas") == 3, f"Expected 3 updated and ready replicas but found {status.get('readyReplicas', 0)} ready of {status.get('replicas', 0)}")
    pods = [p for p in k8s("get pods -l app=catalog")["items"] if not p["metadata"].get("deletionTimestamp")]
    bad = [p["metadata"]["name"] for p in pods if p["spec"]["containers"][0]["image"] != V1]
    ensure(not bad, f"Expected every pod to run {V1} but {bad[0] if bad else ''} does not")
    return "3 pods run version 1"


@c.test("history-after-update.txt shows two revisions")
def _():
    text = read(f"{D}/history-after-update.txt")
    ensure("REVISION" in text, "Expected the output of kubectl rollout history")
    ensure(revisions(text) == [1, 2], f"Expected revisions 1 and 2 but found {revisions(text)}")
    return "Revisions 1 and 2"


@c.test("history-after-rollback.txt shows the renumbered revisions")
def _():
    text = read(f"{D}/history-after-rollback.txt")
    ensure("REVISION" in text, "Expected the output of kubectl rollout history")
    ensure(revisions(text) == [2, 3], f"Expected revisions 2 and 3 after the rollback but found {revisions(text)}")
    return "Revisions 2 and 3"


@c.test("result.txt records the current image and revision count")
def _():
    got = {}
    for line in lines(f"{D}/result.txt", f"the file {D}/result.txt"):
        if "=" in line:
            k, v = line.split("=", 1)
            got[k.strip()] = v.strip()
    ensure(got.get("current_image") == V1, f"Expected current_image={V1} but found {quote(got.get('current_image', ''))}")
    ensure(got.get("revisions") == "2", f"Expected revisions=2 but found {quote(got.get('revisions', ''))}")
    return "result.txt is correct"


c.run()
