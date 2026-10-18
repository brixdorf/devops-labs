import base64
import os
import re

from labcheck import Checker, ensure, gitea_api, k8s, read, wait_until

USER = os.environ.get("GITEA_USER", "student")
c = Checker()


def app():
    return k8s("get application web -n argocd")


def git_head():
    status, data = gitea_api(f"/repos/{USER}/gitops-demo/branches/main")
    return data["commit"]["id"] if status == 200 else ""


@c.test("the Application web points at the repository")
def _():
    a = app()
    ensure(a, "Expected an Argo CD Application named web in the argocd namespace")
    src = a["spec"].get("source") or {}
    ensure(re.fullmatch(rf"http://gitea:3000/{USER}/gitops-demo(\.git)?/?", src.get("repoURL", "")), f"Expected the repository http://gitea:3000/{USER}/gitops-demo.git but found {src.get('repoURL')}")
    ensure(src.get("path", "").strip("/") == "apps/web", f"Expected the path apps/web but found {src.get('path')}")
    ensure(src.get("targetRevision") in ("main", "HEAD", "refs/heads/main"), f"Expected the revision main but found {src.get('targetRevision')}")
    dest = a["spec"].get("destination") or {}
    ensure(dest.get("namespace") == "web", f"Expected the destination namespace web but found {dest.get('namespace')}")
    ensure(dest.get("server") == "https://kubernetes.default.svc" or dest.get("name") == "in-cluster", "Expected the local cluster as destination")
    return "web syncs apps/web from gitops-demo into namespace web"


@c.test("sync is automatic with prune and self heal", requires=["the Application web points at the repository"])
def _():
    policy = app()["spec"].get("syncPolicy") or {}
    auto = policy.get("automated")
    ensure(auto is not None, "Expected an automatic sync policy")
    ensure(auto.get("prune") and auto.get("selfHeal"), "Expected prune and self heal to be enabled")
    ensure("CreateNamespace=true" in (policy.get("syncOptions") or []), "Expected the sync option CreateNamespace=true")
    return "Automated sync with prune and self heal"


@c.test("Git main asks for 4 replicas")
def _():
    status, data = gitea_api(f"/repos/{USER}/gitops-demo/contents/apps/web/deployment.yaml?ref=main")
    ensure(status == 200, "Expected apps/web/deployment.yaml on main")
    text = base64.b64decode(data["content"]).decode()
    ensure(re.search(r"^\s*replicas:\s*4\s*$", text, re.M), "Expected replicas: 4 in apps/web/deployment.yaml on main")
    return "The desired state is 4 replicas"


@c.test("Argo CD synced the latest commit and the app is healthy", requires=["sync is automatic with prune and self heal", "Git main asks for 4 replicas"])
def _():
    head = git_head()

    def synced():
        a = app()
        st = a.get("status") or {}
        return st.get("sync", {}).get("status") == "Synced" and st.get("health", {}).get("status") == "Healthy" and st.get("sync", {}).get("revision") == head

    ensure(wait_until(synced, timeout=120, interval=5), f"Expected the Application to be Synced to {head[:7]} and Healthy")
    history = (app().get("status") or {}).get("history") or []
    ensure(len({h.get("revision") for h in history}) >= 2, "Expected at least two syncs: the first deployment and the change from Git")
    return f"Synced to {head[:7]} and Healthy"


@c.test("the cluster runs 4 replicas, applied by Argo CD", requires=["Argo CD synced the latest commit and the app is healthy"])
def _():
    d = k8s("get deployment web -n web")
    ensure(d, "Expected the Deployment web in the namespace web")
    ensure(d["spec"]["replicas"] == 4 and d["status"].get("readyReplicas") == 4, f"Expected 4 ready replicas but found {d['status'].get('readyReplicas', 0)}")
    meta = d["metadata"]
    tracked = (meta.get("annotations") or {}).get("argocd.argoproj.io/tracking-id", "").startswith("web:") or (meta.get("labels") or {}).get("app.kubernetes.io/instance") == "web"
    ensure(tracked, "Expected the Deployment to be created and tracked by the Argo CD Application web")
    return "4/4 replicas, managed by Argo CD"


@c.test("the synced revision was recorded", requires=["Argo CD synced the latest commit and the app is healthy"])
def _():
    got = read("/home/user/gitops-demo-revision.txt").strip()
    ensure(got == git_head(), f"Expected the synced commit ID {git_head()[:12]}... but found {got[:12]!r}")
    return "The revision matches the latest commit"


c.run()
