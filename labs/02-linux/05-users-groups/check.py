import grp
import os
import pwd

from labcheck import Checker, ensure, mode, owner, run

DIR = "/srv/devops-project"
c = Checker()


@c.test("group devops exists")
def _():
    try:
        grp.getgrnam("devops")
    except KeyError:
        ensure(False, "Expected a group named devops but it does not exist")
    return "Found group devops"


@c.test("user examuser exists with a home directory and bash")
def _():
    try:
        pw = pwd.getpwnam("examuser")
    except KeyError:
        ensure(False, "Expected a user named examuser but it does not exist")
    ensure(pw.pw_dir == "/home/examuser", f"Expected home directory /home/examuser but found {pw.pw_dir}")
    ensure(os.path.isdir(pw.pw_dir), f"Expected {pw.pw_dir} to exist but it was not created")
    ensure(pw.pw_shell == "/bin/bash", f"Expected shell /bin/bash but found {pw.pw_shell}")
    return "examuser has /home/examuser and /bin/bash"


@c.test("examuser is a supplementary member of devops", requires=["group devops exists", "user examuser exists with a home directory and bash"])
def _():
    pw = pwd.getpwnam("examuser")
    devops = grp.getgrnam("devops")
    ensure("examuser" in devops.gr_mem, f"Expected examuser in the devops group but its members are: {', '.join(devops.gr_mem) or 'none'}")
    primary = grp.getgrgid(pw.pw_gid).gr_name
    ensure(primary != "devops", "Expected devops to be a supplementary group, but it is examuser's primary group")
    return f"examuser's groups: {primary}, devops"


@c.test("/srv/devops-project is owned by examuser:devops")
def _():
    ensure(os.path.isdir(DIR), f"Expected the directory {DIR} but it was not found")
    found = owner(DIR)
    ensure(found == "examuser:devops", f"Expected owner examuser:devops but found {found}")
    return "Owned by examuser:devops"


@c.test("/srv/devops-project has mode 2770", requires=["/srv/devops-project is owned by examuser:devops"])
def _():
    found = mode(DIR)
    ensure(found == 0o2770, f"Expected mode 2770 but found {found:o}")
    return "Mode is 2770 (drwxrws---)"


@c.test("examuser can create files that inherit the devops group", requires=["/srv/devops-project has mode 2770", "examuser is a supplementary member of devops"])
def _():
    path = f"{DIR}/.labcheck-probe"
    r = run(["touch", path], user="examuser")
    ensure(r.ok, f"Expected examuser to be able to create a file but it failed: {r.text}")
    group = owner(path).split(":")[1]
    os.remove(path)
    ensure(group == "devops", f"Expected new files to belong to group devops but found {group}")
    return "A file created by examuser belongs to group devops"


@c.test("other users cannot enter the directory", requires=["/srv/devops-project has mode 2770"])
def _():
    r = run(["ls", DIR], user="nobody")
    ensure(not r.ok, "Expected users outside devops to be denied, but nobody could list the directory")
    return "Users outside devops are denied"


c.run()
