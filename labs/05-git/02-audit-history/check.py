import re

from labcheck import Checker, ensure, exists, read, run

REPO = "/home/user/audit-tracker-repo"
c = Checker()


def git(*args):
    r = run(["git", "-C", REPO, "-c", "color.ui=never", *args], user="user")
    return r.out


def content(name):
    path = f"{REPO}/{name}"
    ensure(exists(path), f"Expected {path} but it was not found")
    text = read(path)
    ensure(text.strip(), f"Expected {name} to contain git output but it is empty")
    return text


def norm(text):
    return "\n".join(l.rstrip() for l in text.strip().splitlines())


def hashes_in(text):
    return set(re.findall(r"\b[0-9a-f]{7,40}\b", text))


def commits(*args):
    return git("log", "--format=%H", *args).split()


def mentioned(text, full_hashes):
    found = hashes_in(text)
    return {h for h in full_hashes if any(h.startswith(x) for x in found)}


ALL = commits()


@c.test("compact-history.txt is single-line git log output")
def _():
    text = content("compact-history.txt")
    candidates = [git("log", *opts) for opts in [["--oneline"], ["--pretty=oneline"], ["--oneline", "--decorate"], ["--oneline", "--graph"], ["--oneline", "--all"], ["--pretty=oneline", "--abbrev-commit"]]]
    if norm(text) in {norm(x) for x in candidates}:
        return f"One line for each of the {len(ALL)} commits"
    rows = text.strip().splitlines()
    ensure(len(rows) == len(ALL), f"Expected one line per commit ({len(ALL)} lines) but found {len(rows)}")
    ensure(mentioned(text, ALL) == set(ALL), "Expected every commit of the history in compact form, as printed by git log")
    return f"One line for each of the {len(ALL)} commits"


@c.test("last-3-commits.txt shows exactly the three latest commits")
def _():
    text = content("last-3-commits.txt")
    latest = ALL[:3]
    got = mentioned(text, ALL)
    ensure(got == set(latest), f"Expected the 3 latest commits but the file mentions {len(got)} commits")
    real_subjects = git("log", "-3", "--format=%s").splitlines()
    for s in real_subjects:
        ensure(s in text, f"Expected the commit message {s!r} in the file")
    return "The three latest commits are listed"


@c.test("latest-author.txt contains only the latest author's name")
def _():
    text = content("latest-author.txt").strip()
    want = git("log", "-1", "--format=%an").strip()
    ensure(text == want, f"Expected only {want!r} but found {text[:60]!r}")
    return f"The latest author is {want}"


@c.test("bugfix-commits.txt lists all and only the fix or bug commits")
def _():
    text = content("bugfix-commits.txt")
    wanted = set(commits("-i", "--grep=fix", "--grep=bug"))
    got = mentioned(text, ALL)
    missing = wanted - got
    extra = got - wanted
    subject = lambda h: git("log", "-1", "--format=%s", h).strip()
    if missing:
        ensure(False, f"Expected the commit {subject(sorted(missing)[0])!r} but it is missing")
    if extra:
        ensure(False, f"Did not expect {subject(sorted(extra)[0])!r}, which is not a bug fix")
    return f"All {len(wanted)} bug fix commits are listed"


@c.test("latest-commit-changes.txt shows the diff of the latest commit")
def _():
    text = content("latest-commit-changes.txt")
    diff = git("show", "--format=", "HEAD")
    for header in [l for l in diff.splitlines() if l.startswith("diff --git")]:
        ensure(header in text, f"Expected the diff header {header!r} from the latest commit")
    for added in [l for l in diff.splitlines() if l.startswith("+") and not l.startswith("+++")]:
        ensure(added in text, f"Expected the added line {added!r} from the latest commit")
    return "The file contains the latest commit's changes"


@c.test("the history was not changed")
def _():
    ensure(len(ALL) == 8, f"Expected the original 8 commits but found {len(ALL)}")
    tracked = git("ls-files").split()
    ensure(not any(t.endswith(".txt") for t in tracked), "Expected the output files to stay uncommitted")
    return "The repository still has its original 8 commits"


c.run()
