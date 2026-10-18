import os
import re

from labcheck import Checker, ensure, gitea_api, quote, read, run

REPO = "/home/user/todo-app"
USER = os.environ.get("GITEA_USER", "student")
c = Checker()


def git(*args):
    return run(["git", "-C", REPO, *args], user="user")


@c.test("todo-app is a Git repository on branch main")
def _():
    ensure(os.path.isdir(f"{REPO}/.git"), f"Expected {REPO} to be a Git repository (no .git folder found)")
    branch = git("branch", "--show-current").out.strip()
    ensure(branch == "main", f"Expected the branch main but found {branch or 'none'}")
    return "Repository on branch main"


@c.test("README.md starts with '# Todo App' and describes the app", requires=["todo-app is a Git repository on branch main"])
def _():
    text = read(f"{REPO}/README.md")
    rows = [l for l in text.splitlines()]
    ensure(rows and rows[0].strip() == "# Todo App", f"Expected the first line '# Todo App' but found {quote(rows[0] if rows else '')}")
    ensure(any(l.strip() for l in rows[1:]), "Expected at least one line describing the app after the heading")
    ensure(git("ls-files", "--error-unmatch", "README.md").ok, "Expected README.md to be committed")
    return "README.md is committed with a heading and description"


@c.test("there are at least three meaningful commits", requires=["todo-app is a Git repository on branch main"])
def _():
    r = git("log", "--format=%s")
    msgs = [m.strip() for m in r.out.splitlines() if m.strip()]
    ensure(len(msgs) >= 3, f"Expected at least 3 commits but found {len(msgs)}")
    for m in msgs:
        ensure(len(m.split()) >= 3, f"Expected every commit message to have at least 3 words but found {quote(m)}")
    ensure(len(set(m.lower() for m in msgs)) == len(msgs), "Expected every commit message to be different")
    return f"{len(msgs)} commits with clear messages"


@c.test("commits use your configured name and email", requires=["there are at least three meaningful commits"])
def _():
    for line in git("log", "--format=%an|%ae").out.splitlines():
        name, email = line.split("|", 1)
        ensure(name.strip() and name != "root", f"Expected a configured author name but found {quote(name)}")
        ensure(re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email), f"Expected an email address as author email but found {quote(email)}")
    return "Every commit has an author name and email"


@c.test("everything is committed", requires=["todo-app is a Git repository on branch main"])
def _():
    dirty = git("status", "--porcelain").out.strip()
    ensure(not dirty, f"Expected a clean working tree but found uncommitted changes: {quote(dirty)}")
    return "The working tree is clean"


@c.test("origin points to the Gitea repository", requires=["todo-app is a Git repository on branch main"])
def _():
    url = git("remote", "get-url", "origin").out.strip()
    ensure(url, "Expected a remote named origin")
    ensure(re.search(rf"(localhost:\d+|gitea:3000)/{USER}/todo-app(\.git)?/?$", url), f"Expected origin to be the Gitea todo-app repository but found {quote(url)}")
    return f"origin is {url}"


@c.test("Gitea has the pushed main branch", requires=["origin points to the Gitea repository"])
def _():
    status, repo = gitea_api(f"/repos/{USER}/todo-app")
    ensure(status == 200, f"Expected the repository {USER}/todo-app on Gitea but it was not found")
    status, branch = gitea_api(f"/repos/{USER}/todo-app/branches/main")
    ensure(status == 200, "Expected a main branch on Gitea but it was not pushed")
    remote_sha = branch["commit"]["id"]
    local_sha = git("rev-parse", "HEAD").out.strip()
    ensure(remote_sha == local_sha, f"Expected Gitea's main ({remote_sha[:7]}) to match your latest commit ({local_sha[:7]}). Push again.")
    status, _ = gitea_api(f"/repos/{USER}/todo-app/contents/README.md?ref=main")
    ensure(status == 200, "Expected README.md in the Gitea repository")
    return f"Gitea main is at {remote_sha[:7]}, same as local"


@c.test("main tracks origin/main", requires=["Gitea has the pushed main branch"])
def _():
    upstream = git("rev-parse", "--abbrev-ref", "main@{upstream}").out.strip()
    ensure(upstream == "origin/main", f"Expected main to track origin/main but found {upstream or 'no upstream'}. Use git push -u origin main.")
    return "main tracks origin/main"


c.run()
