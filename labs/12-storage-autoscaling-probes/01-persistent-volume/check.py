import os
from datetime import datetime

from labcheck import Checker, ensure, k8s, read, run

TEXT = "Persistent storage works"
c = Checker()


@c.test("notes-pvc is bound with 1Gi of local-path storage")
def _():
    pvc = k8s("get pvc notes-pvc")
    ensure(pvc, "Expected a PersistentVolumeClaim named notes-pvc")
    spec = pvc["spec"]
    ensure(spec.get("storageClassName") == "local-path", f"Expected storage class local-path but found {spec.get('storageClassName')}")
    ensure("ReadWriteOnce" in spec.get("accessModes", []), f"Expected access mode ReadWriteOnce but found {spec.get('accessModes')}")
    ensure(spec["resources"]["requests"]["storage"] == "1Gi", f"Expected 1Gi but found {spec['resources']['requests']['storage']}")
    ensure(pvc["status"].get("phase") == "Bound", f"Expected the claim to be Bound but it is {pvc['status'].get('phase')}")
    return "notes-pvc is Bound"


@c.test("pod.yaml defines notes-writer with the claim at /data")
def _():
    path = "/home/user/storage/pod.yaml"
    ensure(os.path.isfile(path), f"Expected {path} but it was not found")
    ensure("notes-pvc" in read(path) and "/data" in read(path), "Expected pod.yaml to mount notes-pvc at /data")
    return "pod.yaml mounts notes-pvc"


@c.test("notes-writer runs with notes-pvc mounted at /data", requires=["notes-pvc is bound with 1Gi of local-path storage"])
def _():
    pod = k8s("get pod notes-writer")
    ensure(pod, "Expected a Pod named notes-writer")
    ensure(pod["status"].get("phase") == "Running", f"Expected notes-writer to be Running but it is {pod['status'].get('phase')}")
    vols = {v["name"] for v in pod["spec"].get("volumes", []) if (v.get("persistentVolumeClaim") or {}).get("claimName") == "notes-pvc"}
    mounts = [m for c_ in pod["spec"]["containers"] for m in c_.get("volumeMounts", []) if m["name"] in vols]
    ensure(any(m["mountPath"].rstrip("/") == "/data" for m in mounts), "Expected notes-pvc mounted at /data")
    return "notes-writer uses notes-pvc at /data"


@c.test("the file survived a Pod recreation", requires=["notes-writer runs with notes-pvc mounted at /data"])
def _():
    r = run(["kubectl", "exec", "notes-writer", "--", "sh", "-c", "cat /data/notes.txt; stat -c %Y /data/notes.txt"], timeout=60)
    ensure(r.ok, "Expected /data/notes.txt in the notes-writer Pod")
    content, _, mtime = r.out.strip().rpartition("\n")
    ensure(content.strip() == TEXT, f"Expected the file to say {TEXT!r} but found {content.strip()!r}")
    created = k8s("get pod notes-writer")["metadata"]["creationTimestamp"]
    created_ts = datetime.fromisoformat(created.replace("Z", "+00:00")).timestamp()
    ensure(created_ts > int(mtime), "Expected the Pod to be deleted and created again after the file was written")
    return "The new Pod reads the file the old Pod wrote"


@c.test("after-recreate.txt shows the file contents")
def _():
    ensure(read("/home/user/storage/after-recreate.txt").strip() == TEXT, f"Expected after-recreate.txt to contain {TEXT!r}")
    return "after-recreate.txt is correct"


c.run()
