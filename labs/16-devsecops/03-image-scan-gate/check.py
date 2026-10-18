import base64
import os
import re

from actions import USER, head_sha, jobs, run_for, runs, single_workflow, triggers
from labcheck import Checker, ensure, gitea_api, http, http_json, wait_until

REPO = "inventory-api"
REG = ("http://registry:5000", os.environ.get("REGISTRY_USER", "ci"), os.environ.get("REGISTRY_PASSWORD", ""))
c = Checker()


def job_map(run):
    return {j.get("name"): j.get("conclusion") or j.get("status") for j in jobs(REPO, run["id"])}


def tags():
    status, data = http_json(f"{REG[0]}/v2/inventory/api/tags/list", auth=REG[1:])
    return (data or {}).get("tags") or []


def digest(tag):
    import urllib.request

    req = urllib.request.Request(f"{REG[0]}/v2/inventory/api/manifests/{tag}", method="HEAD")
    req.add_header("Accept", "application/vnd.oci.image.index.v1+json, application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.docker.distribution.manifest.list.v2+json")
    token = base64.b64encode(f"{REG[1]}:{REG[2]}".encode()).decode()
    req.add_header("Authorization", f"Basic {token}")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.headers.get("Docker-Content-Digest")
    except Exception:
        return None


@c.test("build-and-scan builds and scans with the agreed threshold")
def _():
    _, doc, text = single_workflow(REPO)
    ensure("push" in triggers(doc), "Expected the workflow to run on push")
    job = (doc.get("jobs") or {}).get("build-and-scan")
    ensure(job, "Expected a job named build-and-scan")
    cmds = "\n".join(str(s.get("run", "")) for s in job.get("steps") or [])
    ensure("cp -r /opt/wheels wheels" in cmds, "Expected the step cp -r /opt/wheels wheels")
    ensure(re.search(r"docker\s+(image\s+)?build\b.*registry:5000/inventory/api:\$\{\{\s*github\.sha\s*\}\}", cmds), "Expected a build of registry:5000/inventory/api:${{ github.sha }}")
    scan = [l for l in cmds.splitlines() if "trivy image" in l]
    ensure(scan, "Expected a trivy image step")
    for flag in ["--severity CRITICAL", "--pkg-types library", "--ignore-unfixed", "--exit-code 1"]:
        ensure(flag in scan[0], f"Expected {flag} in the trivy command")
    ensure("|| true" not in scan[0], "Expected the scan to fail the job when it finds problems")
    return "The image is built and scanned against the threshold"


@c.test("deploy runs only after a passing scan and pushes prod", requires=["build-and-scan builds and scans with the agreed threshold"])
def _():
    _, doc, text = single_workflow(REPO)
    job = (doc.get("jobs") or {}).get("deploy")
    ensure(job, "Expected a job named deploy")
    needs = job.get("needs")
    needs = [needs] if isinstance(needs, str) else (needs or [])
    ensure("build-and-scan" in needs, "Expected deploy to have needs: build-and-scan")
    cmds = "\n".join(str(s.get("run", "")) for s in job.get("steps") or [])
    ensure("secrets.REGISTRY_PASSWORD" in cmds and "secrets.REGISTRY_USERNAME" in cmds, "Expected the registry login to use the secrets")
    ensure(re.search(r"docker\s+(image\s+)?push\s+registry:5000/inventory/api:prod", cmds), "Expected a push of registry:5000/inventory/api:prod")
    ensure(REG[2] not in text, "Expected no registry password in the workflow")
    return "deploy needs the scan and pushes prod"


@c.test("a run shows the scan blocking the deployment", requires=["deploy runs only after a passing scan and pushes prod"])
def _():
    def blocked():
        for r in runs(REPO):
            if r.get("status") == "completed" and r.get("conclusion") == "failure":
                m = job_map(r)
                if m.get("build-and-scan") == "failure" and m.get("deploy") in ("skipped", "cancelled", "blocked"):
                    return r
        return None

    r = wait_until(blocked, timeout=240, interval=5)
    ensure(r, "Expected a failed run where the scan failed and deploy was skipped. Push the workflow before upgrading Django.")
    return f"Run #{r.get('run_number', r['id'])}: scan failed, deploy skipped"


@c.test("the latest run released the fixed image as prod", requires=["a run shows the scan blocking the deployment"])
def _():
    sha = head_sha(REPO)
    status, data = gitea_api(f"/repos/{USER}/{REPO}/contents/requirements.txt?ref=main")
    reqs = base64.b64decode(data["content"]).decode() if status == 200 else ""
    ensure(os.environ.get("PIP_DJANGO", "").lower() in reqs.lower(), f"Expected {os.environ.get('PIP_DJANGO')} in requirements.txt on main")
    r = run_for(REPO, sha, timeout=280)
    ensure(r, "Expected a finished run for the latest commit on main")
    m = job_map(r)
    ensure(r.get("conclusion") == "success" and m.get("deploy") == "success", f"Expected the latest run to scan and deploy successfully but found {m}")
    have = tags()
    ensure("prod" in have and sha in have, f"Expected the tags prod and {sha[:12]} in the registry but found {have}")
    ensure(digest("prod") and digest("prod") == digest(sha), "Expected prod to be the same image as the latest commit's tag")
    return "prod is the scanned image of the latest commit"


c.run()
