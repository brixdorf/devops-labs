import os

from labcheck import Checker, context, ensure, k8s, lines, quote, read

IMAGE = os.environ.get("IMAGE_NGINX", "")
ctx = context()
c = Checker()


@c.test("diagnosis.txt names the status and the broken image")
def _():
    got = {}
    for line in lines("/home/user/diagnosis.txt", "the file /home/user/diagnosis.txt"):
        if "=" in line:
            k, v = line.split("=", 1)
            got[k.strip()] = v.strip()
    status = got.get("pod_status", "")
    ensure(status in ("ImagePullBackOff", "ErrImagePull"), f"Expected the status ImagePullBackOff but found {quote(status)}")
    ensure(got.get("broken_image") == ctx["broken"], f"Expected the broken image {ctx['broken']} but found {quote(got.get('broken_image', ''))}")
    return f"Diagnosed {status} for {ctx['broken']}"


@c.test("the existing catalog Deployment was fixed, not recreated")
def _():
    d = k8s("get deployment catalog")
    ensure(d, "Expected the deployment catalog")
    ensure(d["metadata"]["uid"] == ctx["uid"], "Expected the original deployment to be fixed in place, not deleted and created again")
    image = d["spec"]["template"]["spec"]["containers"][0]["image"]
    ensure(image == IMAGE, f"Expected the image {IMAGE} but found {image}")
    return f"catalog now uses {IMAGE}"


@c.test("all catalog replicas are available", requires=["the existing catalog Deployment was fixed, not recreated"])
def _():
    d = k8s("get deployment catalog")
    want = d["spec"]["replicas"]
    ensure(d["status"].get("availableReplicas") == want and d["status"].get("updatedReplicas") == want, f"Expected {want} available replicas but found {d['status'].get('availableReplicas', 0)}")
    bad = [p["metadata"]["name"] for p in k8s("get pods -l app=catalog")["items"] if p["status"].get("phase") != "Running"]
    ensure(not bad, f"Expected every catalog pod to be running but {bad[0] if bad else ''} is not")
    return f"{want}/{want} replicas are available"


@c.test("events.txt shows the failure and the recovery")
def _():
    text = read("/home/user/events.txt")
    ensure("Failed" in text and ctx["broken"] in text, "Expected the image pull failures in events.txt")
    ensure(f'"{IMAGE}"' in text or IMAGE in text, "Expected events about pulling the corrected image. Save the events after the fix.")
    return "The events tell the whole story"


c.run()
