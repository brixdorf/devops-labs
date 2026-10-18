import os
import re

from labcheck import Checker, ensure, quote, read, run

SCRIPT = "/home/user/system_info.sh"
c = Checker()


@c.test("system_info.sh exists in the home directory")
def _():
    ensure(os.path.isfile(SCRIPT), f"Expected {SCRIPT} but it was not found")
    return f"Found {SCRIPT}"


@c.test("system_info.sh is executable", requires=["system_info.sh exists in the home directory"])
def _():
    st = os.stat(SCRIPT)
    ensure(st.st_mode & 0o100, f"Expected the owner execute permission but the mode is {st.st_mode & 0o777:o}")
    return f"Mode is {st.st_mode & 0o777:o}"


@c.test("the first line is the bash shebang", requires=["system_info.sh exists in the home directory"])
def _():
    first = read(SCRIPT).split("\n", 1)[0].rstrip("\r").strip()
    ok = re.fullmatch(r"#!\s*(/usr)?/bin/bash|#!\s*/usr/bin/env\s+bash", first)
    ensure(ok, f"Expected '#!/bin/bash' on the first line but found {quote(first)}")
    return f"Shebang is {quote(first)}"


for field in ["Author", "Version", "Description"]:

    @c.test(f"the header documents {field}", requires=["system_info.sh exists in the home directory"])
    def _(field=field):
        text = read(SCRIPT)
        m = re.search(rf"^\s*#\s*{field}\s*:\s*(\S.*)$", text, re.M | re.I)
        ensure(m, f"Expected a comment line like '# {field}: <value>' but it was not found")
        return f"{field}: {m.group(1).strip()}"


@c.test("running the script prints System Information Report", requires=["system_info.sh is executable"])
def _():
    r = run(["./system_info.sh"], user="user", cwd="/home/user", timeout=20)
    ensure(r.code == 0, f"Expected ./system_info.sh to exit with 0 but it exited with {r.code}: {r.err.strip()[:150]}")
    ensure("System Information Report" in r.out.splitlines(), f"Expected a line 'System Information Report' but the output was {quote(r.out)}")
    return "The script prints the report title"


c.run()
