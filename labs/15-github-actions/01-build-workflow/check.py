from actions import head_sha, jobs, run_for, single_workflow, triggers
from labcheck import Checker, ensure

REPO = "calculator"
c = Checker()


@c.test("the workflow file is on main")
def _():
    path, doc, _ = single_workflow(REPO)
    return f"Found {path}"


@c.test("the workflow is named CI and runs on push", requires=["the workflow file is on main"])
def _():
    path, doc, _ = single_workflow(REPO)
    ensure(doc.get("name") == "CI", f"Expected the workflow name CI but found {doc.get('name')!r}")
    ensure("push" in triggers(doc), f"Expected a push trigger but found {sorted(map(str, triggers(doc))) or 'none'}")
    return "name: CI, on: push"


@c.test("the build job checks out, installs and builds", requires=["the workflow is named CI and runs on push"])
def _():
    _, doc, _ = single_workflow(REPO)
    job = (doc.get("jobs") or {}).get("build")
    ensure(job, "Expected a job named build")
    ensure(job.get("runs-on") == "ubuntu-latest", f"Expected runs-on: ubuntu-latest but found {job.get('runs-on')!r}")
    steps = job.get("steps") or []
    kinds = []
    for s in steps:
        uses, cmd = str(s.get("uses", "")), str(s.get("run", ""))
        if uses.startswith("actions/checkout@"):
            kinds.append("checkout")
        elif "pip" in cmd and "requirements.txt" in cmd:
            kinds.append("install")
        elif "make build" in cmd:
            kinds.append("build")
    ensure("checkout" in kinds, "Expected a step that uses actions/checkout")
    ensure("install" in kinds, "Expected a step that runs pip install -r requirements.txt")
    ensure("build" in kinds, "Expected a step that runs make build")
    ensure(kinds.index("checkout") < kinds.index("install") < kinds.index("build"), "Expected the order: checkout, install, build")
    ensure(any(str(s.get("uses", "")) == "actions/checkout@v7" for s in steps), "Expected actions/checkout@v7")
    return "checkout, install and build, in order"


@c.test("the push started a successful run", requires=["the build job checks out, installs and builds"])
def _():
    sha = head_sha(REPO)
    run = run_for(REPO, sha)
    ensure(run, "Expected a finished run for the latest commit on main. Push the workflow and wait for the run.")
    ensure(run.get("event") == "push", f"Expected the run to be triggered by push but it was {run.get('event')}")
    ensure(run.get("conclusion") == "success", f"Expected the run to succeed but it ended with {run.get('conclusion')}. Open it in Gitea and read the log.")
    names = [j.get("name") for j in jobs(REPO, run["id"])]
    ensure("build" in names, f"Expected the build job in the run but found {names}")
    return f"Run #{run.get('run_number', run['id'])} succeeded"


c.run()
