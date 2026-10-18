import os

from labcheck import Checker, ensure, owner

DIR = "/home/user/practice"
NAMES = ["a.txt", "b.txt", "c.txt"]
c = Checker()


@c.test("practice directory exists in /home/user")
def _():
    ensure(os.path.exists(DIR), f"Expected the directory {DIR} but it was not found")
    ensure(os.path.isdir(DIR) and not os.path.islink(DIR), f"Expected {DIR} to be a directory")
    return f"Found {DIR}"


for name in NAMES:

    @c.test(f"{name} is an empty file inside practice", requires=["practice directory exists in /home/user"])
    def _(name=name):
        path = f"{DIR}/{name}"
        ensure(os.path.lexists(path), f"Expected {path} but it was not found")
        ensure(os.path.isfile(path) and not os.path.islink(path), f"Expected {path} to be a regular file")
        size = os.path.getsize(path)
        ensure(size == 0, f"Expected {name} to be empty but it is {size} bytes")
        found = owner(path).split(":")[0]
        ensure(found == "user", f"Expected {name} to be owned by user but found {found}")
        return f"{path} exists and is empty"


@c.test("practice contains only the three files", requires=["practice directory exists in /home/user"])
def _():
    extra = sorted(set(os.listdir(DIR)) - set(NAMES))
    ensure(not extra, f"Expected only a.txt, b.txt and c.txt but also found {', '.join(extra)}")
    return "No other files are in the folder"


c.run()
