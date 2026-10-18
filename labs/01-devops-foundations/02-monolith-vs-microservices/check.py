import re

from labcheck import Checker, context, ensure, lines, quote

DIR = "/home/user/architecture"
ctx = context()
statements = ctx.get("statements", {})
traits = ctx.get("traits", {})
c = Checker()


def ids(path, label):
    found = []
    for line in lines(path, label):
        m = re.fullmatch(r"\s*(S\d+)\s*", line, re.I)
        ensure(m, f"Expected one statement ID per line (like S4) but found {quote(line)}")
        found.append(m.group(1).upper())
    return found


def pick_two(path, kind):
    got = ids(path, f"the file {path}")
    ensure(len(got) == 2, f"Expected exactly 2 IDs in {path} but found {len(got)}")
    ensure(got[0] != got[1], f"Expected 2 different IDs but {got[0]} is listed twice")
    for sid in got:
        ensure(sid in statements, f"{sid} is not a statement in statements.txt")
        actual = statements[sid]
        if actual == "false":
            raise_msg = f"{sid} is a false statement, not a {kind}"
        else:
            raise_msg = f"Expected a {kind} but {sid} is a {actual}"
        ensure(actual == kind, raise_msg)
    return f"{got[0]} and {got[1]} are both real {kind}s"


@c.test("benefits.txt names two real operational benefits")
def _():
    return pick_two(f"{DIR}/benefits.txt", "benefit")


@c.test("challenges.txt names two real operational challenges")
def _():
    return pick_two(f"{DIR}/challenges.txt", "challenge")


@c.test("traits-answer.txt classifies every trait correctly")
def _():
    answers = {}
    for line in lines(f"{DIR}/traits-answer.txt", "the file /home/user/architecture/traits-answer.txt"):
        m = re.fullmatch(r"\s*(T\d+)\s*=\s*(monolith|microservices)\s*", line, re.I)
        ensure(m, f"Expected lines like 'T1=monolith' or 'T1=microservices' but found {quote(line)}")
        answers[m.group(1).upper()] = m.group(2).lower()
    for tid in sorted(traits, key=lambda x: int(x[1:])):
        ensure(tid in answers, f"Expected an answer for {tid} but it is missing")
        ensure(answers[tid] == traits[tid], f"Expected {tid} to be {quote(traits[tid])} but found {quote(answers[tid])}")
    return f"All {len(traits)} traits are classified correctly"


c.run()
