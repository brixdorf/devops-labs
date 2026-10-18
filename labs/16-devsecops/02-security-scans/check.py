import base64
import os

from actions import USER, head_sha, jobs, run_for, runs, single_workflow, triggers
from labcheck import Checker, context, ensure, gitea_api, wait_until

REPO = "payments-api"
ctx = context()
c = Checker()


def file_at(ref, path):
    status, data = gitea_api(f"/repos/{USER}/{REPO}/contents/{path}?ref={ref}")
    return base64.b64decode(data["content"]).decode() if status == 200 else ""


def job_map(run):
    return {j.get("name"): j.get("conclusion") or j.get("status") for j in jobs(REPO, run["id"])}


@c.test("the security job runs Bandit, Trivy and Gitleaks")
def _():
    _, doc, _ = single_workflow(REPO)
    ensure("push" in triggers(doc), "Expected the workflow to run on push")
    job = (doc.get("jobs") or {}).get("security")
    ensure(job, "Expected a job named security")
    cmds = [str(s.get("run", "")) for s in job.get("steps") or []]
    ensure(any(c_.strip().startswith("bandit") and "-r app" in c_ and "-lll" in c_ for c_ in cmds), "Expected a step: bandit -r app -lll")
    ensure(any("trivy fs" in c_ and "--exit-code 1" in c_ and "HIGH,CRITICAL" in c_ for c_ in cmds), "Expected a step: trivy fs --scanners vuln --severity HIGH,CRITICAL --exit-code 1 .")
    ensure(any(c_.strip().startswith("gitleaks") for c_ in cmds), "Expected a gitleaks step")
    bad = [c_ for c_ in cmds if "|| true" in c_ or "--exit-code 0" in c_ or "--no-exit" in c_]
    ensure(not bad, "Expected the scans to fail the job on findings (no '|| true' or exit-code 0)")
    return "Bandit, Trivy and Gitleaks run in the security job"


@c.test("build only runs after security succeeds", requires=["the security job runs Bandit, Trivy and Gitleaks"])
def _():
    _, doc, _ = single_workflow(REPO)
    job = (doc.get("jobs") or {}).get("build")
    ensure(job, "Expected a job named build")
    needs = job.get("needs")
    needs = [needs] if isinstance(needs, str) else (needs or [])
    ensure("security" in needs, "Expected build to have needs: security")
    ensure(any("make build" in str(s.get("run", "")) for s in job.get("steps") or []), "Expected build to run make build")
    return "build needs security"


@c.test("a run shows the gate blocking the build", requires=["build only runs after security succeeds"])
def _():
    def blocked():
        for r in runs(REPO):
            if r.get("status") == "completed" and r.get("conclusion") == "failure":
                m = job_map(r)
                if m.get("security") == "failure" and m.get("build") in ("skipped", "cancelled", "blocked"):
                    return r
        return None

    r = wait_until(blocked, timeout=200, interval=5)
    ensure(r, "Expected a failed run where security failed and build was skipped. Push the workflow before fixing the code.")
    return f"Run #{r.get('run_number', r['id'])}: security failed, build skipped"


@c.test("the findings are fixed in the code")
def _():
    app = file_at("main", "app/app.py")
    config = file_at("main", "app/config.py")
    reqs = file_at("main", "requirements.txt")
    ensure("shell=True" not in app, "Expected app/app.py to call ping without shell=True")
    ensure(ctx.get("key", "AKIA") not in config and "AKIA" not in config, "Expected the hard-coded AWS key to be removed from app/config.py")
    ensure("os.environ" in config and "AWS_SECRET_ACCESS_KEY" in config, "Expected app/config.py to read AWS_SECRET_ACCESS_KEY from the environment")
    want = os.environ.get("PIP_DJANGO", "")
    ensure(want.lower() in reqs.lower(), f"Expected {want} in requirements.txt")
    return "shell=True, the secret and the old Django are gone"


@c.test("the latest run passes both jobs", requires=["the findings are fixed in the code", "a run shows the gate blocking the build"])
def _():
    sha = head_sha(REPO)
    r = run_for(REPO, sha, timeout=240)
    ensure(r, "Expected a finished run for the latest commit on main")
    m = job_map(r)
    ensure(r.get("conclusion") == "success", f"Expected the latest run to succeed but it ended with {r.get('conclusion')} (jobs: {m})")
    ensure(m.get("security") == "success" and m.get("build") == "success", f"Expected security and build to succeed but found {m}")
    return f"Run #{r.get('run_number', r['id'])}: security and build passed"


c.run()
