"""Helpers for checkers of Gitea Actions labs."""
import base64
import os

import yaml
from labcheck import ensure, gitea_api, wait_until

USER = os.environ.get("GITEA_USER", "student")


def workflow_files(repo, ref="main"):
    """Returns {path: parsed YAML} for every workflow file on the branch."""
    found = {}
    for folder in [".gitea/workflows", ".github/workflows"]:
        status, items = gitea_api(f"/repos/{USER}/{repo}/contents/{folder}?ref={ref}")
        if status != 200 or not isinstance(items, list):
            continue
        for item in items:
            if item["name"].endswith((".yml", ".yaml")):
                st, data = gitea_api(f"/repos/{USER}/{repo}/contents/{item['path']}?ref={ref}")
                if st == 200:
                    text = base64.b64decode(data["content"]).decode()
                    try:
                        found[item["path"]] = (yaml.safe_load(text) or {}, text)
                    except yaml.YAMLError as exc:
                        found[item["path"]] = ({"_error": str(exc)}, text)
    return found


def single_workflow(repo):
    files = workflow_files(repo)
    ensure(files, "Expected a workflow file in .gitea/workflows/ (or .github/workflows/) on main")
    path, (doc, text) = sorted(files.items())[0]
    ensure("_error" not in doc, f"Expected valid YAML in {path}: {doc.get('_error', '')[:120]}")
    return path, doc, text


def triggers(doc):
    # YAML 1.1 reads the key "on" as True.
    on = doc.get("on", doc.get(True))
    if isinstance(on, str):
        return {on}
    if isinstance(on, list):
        return set(on)
    if isinstance(on, dict):
        return set(on)
    return set()


def head_sha(repo, branch="main"):
    status, data = gitea_api(f"/repos/{USER}/{repo}/branches/{branch}")
    ensure(status == 200, f"Expected the branch {branch} in {repo}")
    return data["commit"]["id"]


def runs(repo):
    status, data = gitea_api(f"/repos/{USER}/{repo}/actions/runs?limit=50")
    if status != 200 or not isinstance(data, dict):
        return []
    return data.get("workflow_runs") or []


def jobs(repo, run_id):
    status, data = gitea_api(f"/repos/{USER}/{repo}/actions/runs/{run_id}/jobs")
    return (data or {}).get("jobs") or [] if status == 200 else []


def run_for(repo, sha, timeout=180):
    """Waits for the run of a commit to finish and returns it."""

    def finished():
        for r in runs(repo):
            if r.get("head_sha") == sha and r.get("status") == "completed":
                return r
        return None

    return wait_until(finished, timeout=timeout, interval=4)
