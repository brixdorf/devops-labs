import os
import re

from actions import USER, head_sha, run_for, single_workflow, triggers
from labcheck import Checker, ensure, gitea_api, http_json

REPO = "shop-web"
REG_USER = os.environ.get("REGISTRY_USER", "ci")
REG_PASS = os.environ.get("REGISTRY_PASSWORD", "")
c = Checker()


@c.test("the repository has the two registry secrets")
def _():
    status, data = gitea_api(f"/repos/{USER}/{REPO}/actions/secrets")
    names = {s.get("name") for s in (data if isinstance(data, list) else [])} if status == 200 else set()
    for name in ["REGISTRY_USERNAME", "REGISTRY_PASSWORD"]:
        ensure(name in names, f"Expected a repository secret named {name}")
    return "REGISTRY_USERNAME and REGISTRY_PASSWORD exist"


@c.test("the Dockerfile builds the app from the pinned Python image")
def _():
    import base64

    status, data = gitea_api(f"/repos/{USER}/{REPO}/contents/Dockerfile?ref=main")
    ensure(status == 200, "Expected a Dockerfile on main")
    text = base64.b64decode(data["content"]).decode()
    ensure(re.search(rf"^FROM\s+{re.escape(os.environ.get('IMAGE_PYTHON', ''))}\s*$", text, re.M), f"Expected FROM {os.environ.get('IMAGE_PYTHON')}")
    ensure("app.py" in text, "Expected the Dockerfile to copy and run app.py")
    return "The Dockerfile is in place"


@c.test("the workflow logs in with secrets, builds and pushes", requires=["the Dockerfile builds the app from the pinned Python image"])
def _():
    path, doc, text = single_workflow(REPO)
    ensure("push" in triggers(doc), "Expected the workflow to run on push")
    job = (doc.get("jobs") or {}).get("publish")
    ensure(job, "Expected a job named publish")
    runs_text = "\n".join(str(s.get("run", "")) for s in job.get("steps") or [])
    ensure(re.search(r"docker\s+login\s+registry:5000", runs_text), "Expected a docker login registry:5000 step")
    ensure("secrets.REGISTRY_USERNAME" in runs_text and "secrets.REGISTRY_PASSWORD" in runs_text, "Expected the login to use secrets.REGISTRY_USERNAME and secrets.REGISTRY_PASSWORD")
    ensure("--password-stdin" in runs_text, "Expected the password to be passed with --password-stdin")
    ensure(re.search(r"docker\s+(image\s+)?build\b.*registry:5000/shop/web:\$\{\{\s*github\.sha\s*\}\}", runs_text), "Expected a build of registry:5000/shop/web:${{ github.sha }}")
    ensure(re.search(r"docker\s+(image\s+)?push\s+registry:5000/shop/web:\$\{\{\s*github\.sha\s*\}\}", runs_text), "Expected a push of registry:5000/shop/web:${{ github.sha }}")
    return "login, build and push use secrets and the commit ID"


@c.test("no credentials are hard-coded in the workflow", requires=["the workflow logs in with secrets, builds and pushes"])
def _():
    _, _, text = single_workflow(REPO)
    ensure(REG_PASS not in text, "Expected no registry password in the workflow file")
    ensure(not re.search(rf"-u\s+['\"]?{re.escape(REG_USER)}['\"]?(\s|$)", text), "Expected the user name to come from a secret, not to be typed into the workflow")
    return "The workflow contains no credentials"


@c.test("the latest run pushed the image tagged with the commit ID", requires=["no credentials are hard-coded in the workflow", "the repository has the two registry secrets"])
def _():
    sha = head_sha(REPO)
    run = run_for(REPO, sha, timeout=240)
    ensure(run, "Expected a finished run for the latest commit on main")
    ensure(run.get("conclusion") == "success", f"Expected the run to succeed but it ended with {run.get('conclusion')}")
    status, data = http_json("http://registry:5000/v2/shop/web/tags/list", auth=(REG_USER, REG_PASS))
    tags = (data or {}).get("tags") or []
    ensure(sha in tags, f"Expected the tag {sha[:12]}... in registry:5000/shop/web but found {tags or 'no tags'}")
    return f"registry:5000/shop/web:{sha[:12]} exists"


c.run()
