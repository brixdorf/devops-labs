import re

from labcheck import Checker, context, ensure, lines, quote

DIR = "/home/user/roadmap"
key = context().get("reasons", {})
ORDER = [
    ("version control", r"version control|\bgit\b|source control"),
    ("automated tests", r"\btest"),
    ("containerization", r"container|docker"),
    ("CI/CD", r"ci\s*/\s*cd|continuous (integration|delivery|deployment)|pipeline"),
    ("monitoring", r"monitor|observab"),
]
c = Checker()


def steps():
    found = []
    for line in lines(f"{DIR}/roadmap.md", "the file /home/user/roadmap/roadmap.md"):
        m = re.match(r"^\s*(\d+)[.)]\s+([^:]+):\s*(.*)$", line)
        if m:
            found.append((int(m.group(1)), m.group(2).strip(), m.group(3).strip()))
    return found


@c.test("roadmap.md starts with the heading")
def _():
    first = lines(f"{DIR}/roadmap.md", "the file /home/user/roadmap/roadmap.md")[0].strip()
    ensure(first == "# DevOps Roadmap", f"Expected the first line to be '# DevOps Roadmap' but found {quote(first)}")
    return "The roadmap has the right heading"


@c.test("the roadmap has five numbered steps", requires=["roadmap.md starts with the heading"])
def _():
    found = steps()
    ensure(len(found) == 5, f"Expected 5 numbered steps like '1. Version control: reason' but found {len(found)}")
    ensure([n for n, _, _ in found] == [1, 2, 3, 4, 5], f"Expected the steps to be numbered 1 to 5 but found {[n for n, _, _ in found]}")
    return "Found five numbered steps"


@c.test("the steps follow the priority order", requires=["the roadmap has five numbered steps"])
def _():
    for (num, name, _), (want, pattern) in zip(steps(), ORDER):
        ensure(re.search(pattern, name, re.I), f"Expected step {num} to be {want} but found {quote(name)}")
    return "Version control, tests, containers, CI/CD, monitoring"


@c.test("every step has a reason of at least six words", requires=["the roadmap has five numbered steps"])
def _():
    for num, name, reason in steps():
        words = len(re.findall(r"[A-Za-z][A-Za-z'/-]*", reason))
        ensure(words >= 6, f"Expected a reason of at least 6 words for step {num} ({name}) but found {words}")
    return "Every step explains why"


@c.test("reasons-answer.txt matches each practice to its best reason")
def _():
    answers = {}
    for line in lines(f"{DIR}/reasons-answer.txt", "the file /home/user/roadmap/reasons-answer.txt"):
        m = re.fullmatch(r"\s*(P[1-5])\s*=\s*(R\d+)\s*", line, re.I)
        ensure(m, f"Expected lines like 'P1=R4' but found {quote(line)}")
        answers[m.group(1).upper()] = m.group(2).upper()
    for p in ["P1", "P2", "P3", "P4", "P5"]:
        ensure(p in answers, f"Expected an answer for {p} but it is missing")
        ensure(answers[p] == key[p], f"Expected {p} to match {key[p]} but found {answers[p]}")
    return "All five practices have the right reason"


c.run()
