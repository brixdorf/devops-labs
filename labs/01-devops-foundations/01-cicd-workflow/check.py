import re

from labcheck import Checker, context, ensure, exists, lines, quote

DIR = "/home/user/cicd"
STAGES = ["commit", "build", "test", "package", "deploy", "monitor"]
key = context().get("activities", {})
c = Checker()


@c.test("pipeline.txt lists the six stages in order")
def _():
    got = [l.strip().lower() for l in lines(f"{DIR}/pipeline.txt", "the file /home/user/cicd/pipeline.txt")]
    ensure(len(got) == 6, f"Expected 6 stages but found {len(got)} lines")
    for i, (want, have) in enumerate(zip(STAGES, got), start=1):
        ensure(want == have, f"Expected stage {i} to be {quote(want)} but found {quote(have)}")
    return "All six stages are in the right order"


@c.test("diagram.txt draws the flow on one line")
def _():
    got = lines(f"{DIR}/diagram.txt", "the file /home/user/cicd/diagram.txt")
    ensure(len(got) == 1, f"Expected exactly 1 line but found {len(got)}")
    parts = [p.strip().lower() for p in re.split(r"\s*->\s*", got[0].strip())]
    ensure(len(parts) == 6, f"Expected 6 stages joined by ' -> ' but found {len(parts)} parts in {quote(got[0])}")
    ensure(parts == STAGES, f"Expected {quote(' -> '.join(STAGES))} but found {quote(got[0].strip())}")
    return "The diagram shows commit -> build -> test -> package -> deploy -> monitor"


@c.test("activities.txt labels every activity")
def _():
    path = f"{DIR}/activities.txt"
    ensure(exists(path), f"Expected {path} but it was not found")
    answers = {}
    for line in lines(path):
        m = re.fullmatch(r"\s*(A\d+)\s*=\s*([a-z]+)\s*", line.strip(), re.I)
        ensure(m, f"Expected lines like 'A1=build' but found {quote(line)}")
        answers[m.group(1).upper()] = m.group(2).lower()
    missing = [a for a in key if a not in answers]
    ensure(not missing, f"Expected all 8 activities but {', '.join(missing)} is missing")
    return "All 8 activities are listed"


@c.test("each activity is assigned to the correct stage", requires=["activities.txt labels every activity"])
def _():
    answers = {}
    for line in lines(f"{DIR}/activities.txt"):
        a, s = line.split("=", 1)
        answers[a.strip().upper()] = s.strip().lower()
    for activity in sorted(key, key=lambda x: int(x[1:])):
        ensure(answers[activity] in STAGES, f"{activity}: {quote(answers[activity])} is not one of the six stage names")
        ensure(answers[activity] == key[activity], f"Expected {activity} to be {quote(key[activity])} but found {quote(answers[activity])}")
    return "Every activity is in the right stage"


c.run()
