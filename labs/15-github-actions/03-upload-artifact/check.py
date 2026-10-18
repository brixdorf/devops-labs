import io
import os
import zipfile

from actions import USER, head_sha, run_for, single_workflow
from labcheck import Checker, ensure, gitea_api, http, read

REPO = "calculator"
c = Checker()


def artifacts():
    status, data = gitea_api(f"/repos/{USER}/{REPO}/actions/artifacts")
    return (data or {}).get("artifacts") or [] if status == 200 else []


@c.test("the workflow uploads dist/calculator.pyz as calculator")
def _():
    _, doc, _ = single_workflow(REPO)
    steps = ((doc.get("jobs") or {}).get("build") or {}).get("steps") or []
    up = [s for s in steps if str(s.get("uses", "")).startswith("actions/upload-artifact@")]
    ensure(up, "Expected a step that uses actions/upload-artifact")
    ensure(up[0]["uses"] == "actions/upload-artifact@v7", f"Expected actions/upload-artifact@v7 but found {up[0]['uses']}")
    w = up[0].get("with") or {}
    ensure(w.get("name") == "calculator", f"Expected the artifact name calculator but found {w.get('name')!r}")
    ensure(str(w.get("path", "")).strip() == "dist/calculator.pyz", f"Expected the path dist/calculator.pyz but found {w.get('path')!r}")
    ensure(steps.index(up[0]) > max(i for i, s in enumerate(steps) if "make build" in str(s.get("run", ""))), "Expected the upload to run after the build")
    return "upload-artifact@v7 uploads dist/calculator.pyz as calculator"


@c.test("the latest run succeeded and published the artifact", requires=["the workflow uploads dist/calculator.pyz as calculator"])
def _():
    sha = head_sha(REPO)
    run = run_for(REPO, sha)
    ensure(run, "Expected a finished run for the latest commit on main")
    ensure(run.get("conclusion") == "success", f"Expected the run to succeed but it ended with {run.get('conclusion')}")
    mine = [a for a in artifacts() if a.get("name") == "calculator" and (a.get("workflow_run") or {}).get("id") == run["id"]]
    ensure(mine, "Expected an artifact named calculator from the latest run")
    status, body = gitea_api(f"/repos/{USER}/{REPO}/actions/artifacts/{mine[0]['id']}")
    ensure(status == 200, "Expected the artifact to be downloadable")
    return f"Run #{run.get('run_number', run['id'])} published calculator"


@c.test("calculator.zip was downloaded and contains the app")
def _():
    path = "/home/user/artifact/calculator.zip"
    ensure(os.path.isfile(path), f"Expected {path} but it was not found")
    try:
        names = zipfile.ZipFile(path).namelist()
    except zipfile.BadZipFile:
        names = None
    ensure(names is not None, "Expected calculator.zip to be a zip file. Did curl save an error page? Use -L and the zip URL.")
    ensure("calculator.pyz" in names, f"Expected calculator.pyz inside the zip but found {names}")
    return "The zip contains calculator.pyz"


@c.test("the downloaded app computes 6 x 7")
def _():
    ensure(os.path.isfile("/home/user/artifact/calculator.pyz"), "Expected the unzipped /home/user/artifact/calculator.pyz")
    text = read("/home/user/artifact/result.txt").strip()
    ensure(text == "42", f"Expected 42 in result.txt but found {text!r}")
    return "calculator.pyz printed 42"


c.run()
