import os
import re

from labcheck import Checker, ensure, quote, read, run

SCRIPT = "/home/user/solution.sh"
c = Checker()


@c.test("solution.sh exists in /home/user")
def _():
    ensure(os.path.isfile(SCRIPT), f"Expected {SCRIPT} but it was not found")
    return f"Found {SCRIPT}"


@c.test("the first line is a shell shebang", requires=["solution.sh exists in /home/user"])
def _():
    first = read(SCRIPT).split("\n", 1)[0].rstrip("\r")
    ok = re.fullmatch(r"#!\s*(/usr)?/bin/(ba)?sh|#!\s*/usr/bin/env\s+(ba)?sh", first.strip())
    ensure(ok, f"Expected a shebang such as '#!/bin/bash' on the first line but found {quote(first)}")
    return f"Shebang is {quote(first)}"


@c.test("the script prints exactly Hello, World!", requires=["solution.sh exists in /home/user"])
def _():
    r = run(["bash", SCRIPT], user="user", cwd="/home/user", timeout=20)
    ensure(r.code == 0, f"Expected the script to exit with 0 but it exited with {r.code}: {r.err.strip()[:120]}")
    out = r.out[:-1] if r.out.endswith("\n") else r.out
    ensure(out == "Hello, World!", f"Expected 'Hello, World!' but found {quote(out)}")
    return "Output is 'Hello, World!'"


c.run()
