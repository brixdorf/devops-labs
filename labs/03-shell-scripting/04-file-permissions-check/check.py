import os
import shutil
import tempfile

from labcheck import Checker, ensure, quote, run

SCRIPT = "/home/user/scripts/filecheck.sh"
c = Checker()
base = tempfile.mkdtemp(prefix="filecheck-", dir="/tmp")
os.chmod(base, 0o755)


def make(name, mode, owner_name="user"):
    path = os.path.join(base, name)
    with open(path, "w") as fh:
        fh.write("#!/bin/sh\necho hi\n")
    shutil.chown(path, owner_name, owner_name)
    os.chmod(path, mode)
    return path


def call(*args):
    return run(["bash", SCRIPT, *args], user="user", cwd="/home/user", timeout=20)


@c.test("filecheck.sh exists")
def _():
    ensure(os.path.isfile(SCRIPT), f"Expected {SCRIPT} but it was not found")
    return f"Found {SCRIPT}"


CASES = [
    ("your own file with mode 644", "notes.txt", 0o644, "user", ("yes", "yes", "no")),
    ("your own read-only file (400)", "readonly.txt", 0o400, "user", ("yes", "no", "no")),
    ("your own script with mode 755", "deploy.sh", 0o755, "user", ("yes", "yes", "yes")),
    ("a file with no permissions (000)", "locked.txt", 0o000, "user", ("no", "no", "no")),
    ("a root-owned file with mode 644", "root config.conf", 0o644, "root", ("yes", "no", "no")),
    ("a root-owned file with mode 600", "secret.key", 0o600, "root", ("no", "no", "no")),
]

for title, name, mode, owner_name, (r_, w_, x_) in CASES:

    @c.test(f"reports {title}", requires=["filecheck.sh exists"])
    def _(name=name, mode=mode, owner_name=owner_name, r_=r_, w_=w_, x_=x_):
        path = make(name, mode, owner_name)
        r = call(path)
        ensure(r.code == 0, f"Expected exit status 0 for an existing file but found {r.code} ({r.err.strip()[:100]})")
        want = f"exists: yes\nreadable: {r_}\nwritable: {w_}\nexecutable: {x_}"
        got = r.out.strip()
        ensure(got == want, f"Expected {quote(want)} but found {quote(got)}")
        return f"readable: {r_}, writable: {w_}, executable: {x_}"


@c.test("a missing file prints exists: no and exits 1", requires=["filecheck.sh exists"])
def _():
    r = call(os.path.join(base, "does not exist.txt"))
    ensure(r.code == 1, f"Expected exit status 1 for a missing file but found {r.code}")
    ensure(r.out.strip() == "exists: no", f"Expected 'exists: no' but found {quote(r.out.strip())}")
    return "Missing files are reported"


@c.test("a missing argument prints usage and exits 2", requires=["filecheck.sh exists"])
def _():
    r = call()
    ensure(r.code == 2, f"Expected exit status 2 with no argument but found {r.code}")
    ensure(r.err.strip() == "Usage: filecheck.sh <file>", f"Expected 'Usage: filecheck.sh <file>' on standard error but found {quote(r.err.strip())}")
    r2 = call("/etc/passwd", "/etc/hosts")
    ensure(r2.code == 2, f"Expected exit status 2 with two arguments but found {r2.code}")
    return "Usage message and exit status 2"


c.run()
shutil.rmtree(base, ignore_errors=True)
