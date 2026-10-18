import os

from labcheck import Checker, context, ensure, exists, quote, read, run

REPO = "/home/user/website"
ctx = context()
c = Checker()
EXPECTED = [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8">',
    "  <title>Northwind Shop | Welcome Home</title>",
    "</head>",
    "<body>",
    "  <h1>Our products</h1>",
    "  <p>Fresh coffee, tea and snacks.</p>",
    "</body>",
    "</html>",
]


def git(*args):
    return run(["git", "-C", REPO, *args], user="user")


@c.test("the merge is finished")
def _():
    ensure(not exists(f"{REPO}/.git/MERGE_HEAD"), "Expected the merge to be committed, but Git is still in the middle of a merge")
    dirty = git("status", "--porcelain").out.strip()
    ensure(not dirty, f"Expected a clean working tree but found {quote(dirty)}")
    return "No merge in progress and nothing uncommitted"


@c.test("main ends with a merge commit of both branches")
def _():
    current = git("branch", "--show-current").out.strip()
    ensure(current == "main", f"Expected to be on main but found {current or 'a detached HEAD'}")
    parents = git("rev-list", "--parents", "-n", "1", "main").out.split()[1:]
    ensure(len(parents) == 2, f"Expected the latest commit on main to be a merge with 2 parents but it has {len(parents)}")
    ensure(parents[0] == ctx["main"], "Expected the first parent to be the previous tip of main")
    ensure(parents[1] == ctx["feature"], "Expected the second parent to be the tip of feature/new-title")
    return "main's latest commit merges feature/new-title"


@c.test("index.html has no conflict markers")
def _():
    text = read(f"{REPO}/index.html")
    for marker in ["<<<<<<<", "=======", ">>>>>>>"]:
        ensure(marker not in text, f"Expected no conflict markers but found {quote(marker)} in index.html")
    return "No conflict markers are left"


@c.test("the title line is the combined title")
def _():
    rows = read(f"{REPO}/index.html").splitlines()
    titles = [r for r in rows if "<title>" in r]
    ensure(titles, "Expected a <title> line in index.html")
    ensure(titles[0] == EXPECTED[4], f"Expected {quote(EXPECTED[4])} but found {quote(titles[0])}")
    return "The title is 'Northwind Shop | Welcome Home'"


@c.test("the rest of index.html is unchanged", requires=["index.html has no conflict markers"])
def _():
    rows = [r.rstrip() for r in read(f"{REPO}/index.html").strip().splitlines()]
    ensure(rows == EXPECTED, "Expected every other line of index.html to stay as it was")
    committed = git("show", "main:index.html").out.strip().splitlines()
    ensure([r.rstrip() for r in committed] == EXPECTED, "Expected the resolved file to be committed in the merge")
    return "The committed file matches the expected page"


@c.test("merge-history.txt shows the merge in the graph", requires=["main ends with a merge commit of both branches"])
def _():
    path = "/home/user/merge-history.txt"
    text = read(path)
    merge = git("rev-parse", "--short", "main").out.strip()
    ensure(merge in text, f"Expected the merge commit {merge} in {path}. Generate it again after committing the merge.")
    ensure(any(l.lstrip().startswith("*") and "|" in text for l in text.splitlines()), "Expected graph output (lines with * and |) from git log --graph")
    for h in [ctx["main"], ctx["feature"]]:
        short = git("rev-parse", "--short", h).out.strip()
        ensure(short in text, f"Expected the commit {short} in the history graph")
    return "The graph shows both branches joined by the merge"


c.run()
