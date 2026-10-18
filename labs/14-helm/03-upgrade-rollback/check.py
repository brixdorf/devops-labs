import json
import os

from labcheck import Checker, ensure, k8s, read, run

D = "/home/user/charts"
V1 = os.environ.get("IMAGE_PODINFO_PREVIOUS", "")
V2 = os.environ.get("IMAGE_PODINFO", "")
c = Checker()


def history():
    r = run(["helm", "history", "catalog", "-n", "catalog", "-o", "json"])
    return json.loads(r.out) if r.ok else []


def values(rev):
    r = run(["helm", "get", "values", "catalog", "-n", "catalog", "--revision", str(rev), "-o", "json"])
    return json.loads(r.out) if r.ok else {}


@c.test("revision 2 was an upgrade to the new version with 2 replicas")
def _():
    revs = {h["revision"]: h for h in history()}
    ensure(2 in revs, "Expected revision 2 from a helm upgrade")
    v = values(2)
    ensure((v.get("image") or {}).get("tag") == V2.rsplit(":", 1)[1], f"Expected revision 2 to use the tag {V2.rsplit(':', 1)[1]}")
    ensure((v.get("image") or {}).get("repository") == V1.rsplit(":", 1)[0], "Expected the image repository to stay the same")
    ensure(v.get("replicaCount") == 2, f"Expected replicaCount 2 in revision 2 but found {v.get('replicaCount')}")
    return "Revision 2 upgraded the tag and replica count"


@c.test("revision 3 is a rollback to revision 1", requires=["revision 2 was an upgrade to the new version with 2 replicas"])
def _():
    revs = {h["revision"]: h for h in history()}
    ensure(max(revs) == 3, f"Expected the release to be at revision 3 but it is at {max(revs)}")
    ensure("Rollback to 1" in revs[3].get("description", ""), f"Expected revision 3 to be 'Rollback to 1' but found {revs[3].get('description')!r}")
    ensure(revs[3]["status"] == "deployed", f"Expected revision 3 to be deployed but it is {revs[3]['status']}")
    ensure(revs[1]["status"] == "superseded" and revs[2]["status"] == "superseded", "Expected revisions 1 and 2 to be superseded")
    return "Revision 3: Rollback to 1, deployed"


@c.test("the cluster runs the old version again", requires=["revision 3 is a rollback to revision 1"])
def _():
    d = k8s("get deployment catalog -n catalog")
    ensure(d, "Expected the deployment catalog")
    ensure(d["spec"]["template"]["spec"]["containers"][0]["image"] == V1, f"Expected the image {V1} after the rollback")
    ensure(d["spec"]["replicas"] == 1 and d["status"].get("readyReplicas") == 1, "Expected 1 ready replica after the rollback")
    return f"1 replica of {V1}"


@c.test("the history files show the revisions")
def _():
    after_up = read(f"{D}/history-after-upgrade.txt")
    after_rb = read(f"{D}/history-after-rollback.txt")
    ensure("REVISION" in after_up and "Upgrade complete" in after_up and "Rollback" not in after_up, "Expected history-after-upgrade.txt to show revisions 1 and 2 before the rollback")
    ensure("Rollback to 1" in after_rb, "Expected history-after-rollback.txt to show 'Rollback to 1'")
    return "Both history snapshots are saved"


@c.test("final-status.txt shows a deployed release at revision 3")
def _():
    text = read(f"{D}/final-status.txt")
    ensure("STATUS: deployed" in text, "Expected 'STATUS: deployed' in final-status.txt")
    ensure("REVISION: 3" in text, "Expected 'REVISION: 3' in final-status.txt")
    return "The final status is saved"


c.run()
