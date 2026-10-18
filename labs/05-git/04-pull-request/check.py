import base64
import os
import re

from labcheck import Checker, context, ensure, gitea_api, quote, run

REPO = "/home/user/greeter"
USER = os.environ.get("GITEA_USER", "student")
ctx = context()
c = Checker()


def git(*args):
    return run(["git", "-C", REPO, *args], user="user")


def pulls():
    status, data = gitea_api(f"/repos/{USER}/greeter/pulls?state=all&limit=50")
    return data if status == 200 and isinstance(data, list) else []


def the_pr():
    for pr in pulls():
        if pr.get("head", {}).get("ref") == "feature/farewell" and pr.get("base", {}).get("ref") == "main":
            return pr
    return None


def remote_greeter():
    status, data = gitea_api(f"/repos/{USER}/greeter/contents/greeter.py?ref=main")
    ensure(status == 200, "Expected greeter.py on main in Gitea")
    return base64.b64decode(data["content"]).decode()


@c.test("a commit with the change exists on feature/farewell")
def _():
    log = git("log", "--format=%s", f"{ctx['base']}..feature/farewell")
    ensure(git("rev-parse", "--verify", "--quiet", "refs/heads/feature/farewell").ok, "Expected a local branch named feature/farewell")
    msgs = [m for m in log.out.splitlines() if m.strip()]
    ensure(msgs, "Expected at least one new commit on feature/farewell")
    for m in msgs:
        ensure(len(m.split()) >= 3, f"Expected commit messages with at least 3 words but found {quote(m)}")
    return f"{len(msgs)} commit(s) on feature/farewell"


@c.test("a pull request from feature/farewell into main exists")
def _():
    pr = the_pr()
    ensure(pr, "Expected a pull request with feature/farewell as the head branch and main as the base")
    ensure("farewell" in pr.get("title", "").lower(), f"Expected the pull request title to contain 'farewell' but found {quote(pr.get('title', ''))}")
    return f"PR #{pr['number']}: {pr['title']}"


@c.test("the pull request was merged", requires=["a pull request from feature/farewell into main exists"])
def _():
    pr = the_pr()
    ensure(pr.get("merged"), f"Expected PR #{pr['number']} to be merged but it is {pr.get('state')} and not merged")
    return f"PR #{pr['number']} is merged"


@c.test("main on Gitea has a working farewell function", requires=["the pull request was merged"])
def _():
    source = remote_greeter()
    namespace = {}
    exec(compile(source, "greeter.py", "exec"), namespace)
    ensure("farewell" in namespace, "Expected a farewell function in greeter.py on main")
    got = namespace["farewell"]("Ada")
    ensure(got == "Goodbye, Ada!", f"Expected farewell('Ada') to return 'Goodbye, Ada!' but it returned {quote(got)}")
    ensure(namespace.get("greet") and namespace["greet"]("Ada") == "Hello, Ada!", "Expected greet('Ada') to still return 'Hello, Ada!'")
    return "farewell('Ada') returns 'Goodbye, Ada!'"


@c.test("main changed only through the pull request", requires=["the pull request was merged"])
def _():
    pr = the_pr()
    status, branch = gitea_api(f"/repos/{USER}/greeter/branches/main")
    head = branch["commit"]["id"]
    ensure(head == pr.get("merge_commit_sha"), "Expected the latest commit on main to be the pull request merge, not a direct push")
    return "main's latest commit is the PR merge"


@c.test("local main is up to date with Gitea", requires=["the pull request was merged"])
def _():
    current = git("branch", "--show-current").out.strip()
    ensure(current == "main", f"Expected your local repository to be on main but it is on {current or 'a detached HEAD'}")
    status, branch = gitea_api(f"/repos/{USER}/greeter/branches/main")
    remote = branch["commit"]["id"]
    local = git("rev-parse", "main").out.strip()
    ensure(local == remote, f"Expected local main ({local[:7]}) to match Gitea's main ({remote[:7]}). Run git pull.")
    return f"local main is at {local[:7]}"


c.run()
