import hashlib
import os

from labcheck import Checker, context, ensure, exists, owner

DIR = "/home/user/task_8"
FILES = [f"{DIR}/audit.log", f"{DIR}/confidential/file1", f"{DIR}/confidential/file2"]
ctx = context()
c = Checker()


@c.test("all three files still exist")
def _():
    for path in FILES:
        ensure(exists(path) and os.path.isfile(path), f"Expected {path} but it was not found")
    return "audit.log, file1 and file2 are present"


@c.test("audit.log is owned by nobody:nogroup", requires=["all three files still exist"])
def _():
    found = owner(FILES[0])
    ensure(found == "nobody:nogroup", f"Expected owner nobody:nogroup but found {found}")
    return "audit.log is owned by nobody:nogroup"


@c.test("confidential/file1 is owned by nobody", requires=["all three files still exist"])
def _():
    found = owner(FILES[1]).split(":")[0]
    ensure(found == "nobody", f"Expected owner nobody but found {found}")
    return "file1 is owned by nobody"


@c.test("confidential/file2 is owned by nobody", requires=["all three files still exist"])
def _():
    found = owner(FILES[2]).split(":")[0]
    ensure(found == "nobody", f"Expected owner nobody but found {found}")
    return "file2 is owned by nobody"


@c.test("the files were not edited or recreated", requires=["all three files still exist"])
def _():
    data = b"".join(open(p, "rb").read() for p in FILES)
    ensure(hashlib.sha256(data).hexdigest() == ctx.get("sum"), "Expected the original file contents but at least one file was changed")
    inodes = ",".join(str(os.stat(p).st_ino) for p in FILES)
    ensure(inodes == ctx.get("inodes"), "Expected the original files but at least one was deleted and recreated")
    return "The original files and contents are unchanged"


c.run()
