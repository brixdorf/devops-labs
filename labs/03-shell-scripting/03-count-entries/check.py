import os
import shutil
import tempfile

from labcheck import Checker, ensure, quote, run

SCRIPT = "/home/user/scripts/count.sh"
c = Checker()


def make_tree(spec):
    """spec: list of paths; a trailing slash means a directory."""
    base = tempfile.mkdtemp(prefix="count-", dir="/tmp")
    for item in spec:
        full = os.path.join(base, item.rstrip("/"))
        if item.endswith("/"):
            os.makedirs(full, exist_ok=True)
        else:
            os.makedirs(os.path.dirname(full), exist_ok=True)
            open(full, "w").close()
    os.chmod(base, 0o755)
    shutil.chown(base, "user", "user")
    for root, dirs, files in os.walk(base):
        for name in dirs + files:
            shutil.chown(os.path.join(root, name), "user", "user")
    return base


def call(*args):
    return run(["bash", SCRIPT, *args], user="user", cwd="/home/user", timeout=20)


@c.test("count.sh exists")
def _():
    ensure(os.path.isfile(SCRIPT), f"Expected {SCRIPT} but it was not found")
    return f"Found {SCRIPT}"


CASES = [
    ("a mixed directory", ["a.txt", "b.txt", "c.log", "src/", "docs/"], 3, 2),
    ("hidden entries and spaces in names", [".env", "my notes.txt", ".git/", "build output/"], 2, 2),
    ("an empty directory", [], 0, 0),
    ("nested content that must not be counted", ["top.txt", "sub/", "sub/inner.txt", "sub/deeper/", "sub/deeper/x.txt"], 1, 1),
]

for title, spec, nfiles, ndirs in CASES:

    @c.test(f"counts {title}", requires=["count.sh exists"])
    def _(spec=spec, nfiles=nfiles, ndirs=ndirs):
        base = make_tree(spec)
        try:
            r = call(base)
        finally:
            shutil.rmtree(base, ignore_errors=True)
        ensure(r.code == 0, f"Expected exit status 0 but found {r.code} ({r.err.strip()[:100]})")
        want = f"Files: {nfiles}\nDirectories: {ndirs}"
        got = r.out.strip()
        ensure(got == want, f"Expected {quote(want)} but found {quote(got)}")
        return f"Files: {nfiles}, Directories: {ndirs}"


@c.test("a missing argument prints usage and exits 1", requires=["count.sh exists"])
def _():
    r = call()
    ensure(r.code == 1, f"Expected exit status 1 with no argument but found {r.code}")
    ensure(r.err.strip() == "Usage: count.sh <directory>", f"Expected 'Usage: count.sh <directory>' on standard error but found {quote(r.err.strip())}")
    r2 = call("/tmp", "/home")
    ensure(r2.code == 1, f"Expected exit status 1 with two arguments but found {r2.code}")
    return "Usage message and exit status 1"


@c.test("a path that does not exist exits 2", requires=["count.sh exists"])
def _():
    r = call("/nope/missing dir")
    ensure(r.code == 2, f"Expected exit status 2 for a missing path but found {r.code}")
    want = "Error: /nope/missing dir is not a directory"
    ensure(r.err.strip() == want, f"Expected {quote(want)} on standard error but found {quote(r.err.strip())}")
    return "Missing paths are rejected"


@c.test("a regular file is rejected with exit 2", requires=["count.sh exists"])
def _():
    r = call("/etc/hostname")
    ensure(r.code == 2, f"Expected exit status 2 for a file but found {r.code}")
    want = "Error: /etc/hostname is not a directory"
    ensure(r.err.strip() == want, f"Expected {quote(want)} on standard error but found {quote(r.err.strip())}")
    return "Files are rejected"


c.run()
