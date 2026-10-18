from labcheck import Checker, context, ensure, run

REPO = "/home/user/app-metrics-docs"
ctx = context()
c = Checker()


def git(*args):
    return run(["git", "-C", REPO, *args], user="user")


@c.test("the branch feature-update exists")
def _():
    r = git("rev-parse", "--verify", "--quiet", "refs/heads/feature-update")
    ensure(r.ok, "Expected a branch named feature-update but it was not found in git branch")
    return "feature-update is listed by git branch"


@c.test("feature-update starts from main", requires=["the branch feature-update exists"])
def _():
    tip = git("rev-parse", "feature-update").out.strip()
    ensure(tip == ctx["head"], f"Expected feature-update to point at main's latest commit {ctx['head'][:7]} but found {tip[:7]}")
    return f"feature-update points at {tip[:7]}, the tip of main"


@c.test("the active branch is still main")
def _():
    current = git("branch", "--show-current").out.strip()
    ensure(current == "main", f"Expected the active branch to be main but found {current or 'a detached HEAD'}")
    return "You are still on main"


@c.test("the existing branches and history are unchanged")
def _():
    for b in ["main", "develop", "hotfix-dashboard"]:
        ensure(git("rev-parse", "--verify", "--quiet", f"refs/heads/{b}").ok, f"Expected the branch {b} to still exist")
    ensure(git("rev-parse", "main").out.strip() == ctx["head"], "Expected main to be unchanged (no new commits)")
    return "main, develop and hotfix-dashboard are unchanged"


c.run()
