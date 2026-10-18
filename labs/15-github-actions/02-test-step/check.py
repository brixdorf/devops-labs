import base64

from actions import USER, head_sha, jobs, run_for, runs, single_workflow
from labcheck import Checker, ensure, gitea_api, wait_until

REPO = "calculator"
c = Checker()


def step_kinds(doc):
    steps = ((doc.get("jobs") or {}).get("build") or {}).get("steps") or []
    kinds = []
    for s in steps:
        cmd = str(s.get("run", ""))
        if str(s.get("uses", "")).startswith("actions/checkout@"):
            kinds.append("checkout")
        elif "pip" in cmd and "requirements" in cmd:
            kinds.append("install")
        elif "make test" in cmd or "pytest" in cmd:
            kinds.append("test")
        elif "make build" in cmd:
            kinds.append("build")
    return kinds, steps


def file_at(sha, path):
    status, data = gitea_api(f"/repos/{USER}/{REPO}/contents/{path}?ref={sha}")
    return base64.b64decode(data["content"]).decode() if status == 200 else ""


@c.test("the workflow runs the tests between install and build")
def _():
    _, doc, _ = single_workflow(REPO)
    kinds, steps = step_kinds(doc)
    ensure("test" in kinds, "Expected a step that runs make test")
    ensure(any(s.get("name") == "Run tests" for s in steps), "Expected the test step to be named 'Run tests'")
    ensure(kinds.index("install") < kinds.index("test") < kinds.index("build"), "Expected the order: install, Run tests, Build")
    return "Run tests sits between install and build"


@c.test("a run failed because of the wrong test", requires=["the workflow runs the tests between install and build"])
def _():
    def find():
        for r in runs(REPO):
            if r.get("status") != "completed" or r.get("conclusion") != "failure":
                continue
            tests = file_at(r["head_sha"], "tests/test_calc.py")
            workflow = file_at(r["head_sha"], ".gitea/workflows/ci.yml") + file_at(r["head_sha"], ".github/workflows/ci.yml")
            if "== 13" in tests and "make test" in workflow:
                return r
        return None

    r = wait_until(find, timeout=180, interval=5)
    ensure(r, "Expected a failed run for a commit with the wrong multiply test (== 13) and the test step")
    for job in jobs(REPO, r["id"]):
        steps = {s.get("name"): s.get("conclusion") or s.get("status") for s in job.get("steps") or []}
        if steps:
            ensure(steps.get("Run tests") == "failure", f"Expected the Run tests step to fail but it was {steps.get('Run tests')}")
            ensure(steps.get("Build") in ("skipped", "cancelled", None), f"Expected the Build step not to run but it was {steps.get('Build')}")
    return f"Run #{r.get('run_number', r['id'])} failed at Run tests"


@c.test("the latest run on main passes with the corrected test", requires=["a run failed because of the wrong test"])
def _():
    sha = head_sha(REPO)
    tests = file_at(sha, "tests/test_calc.py")
    ensure("def test_multiply" in tests and "== 12" in tests and "== 13" not in tests, "Expected tests/test_calc.py on main to contain the corrected multiply test (== 12)")
    r = run_for(REPO, sha)
    ensure(r, "Expected a finished run for the latest commit on main")
    ensure(r.get("conclusion") == "success", f"Expected the latest run to succeed but it ended with {r.get('conclusion')}")
    return f"Run #{r.get('run_number', r['id'])} passed"


c.run()
