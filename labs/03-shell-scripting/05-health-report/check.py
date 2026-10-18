import os
import re

from labcheck import Checker, ensure, quote, read, run

SCRIPT = "/home/user/scripts/health.sh"
PATHS = ["/", "/var", "/tmp"]
c = Checker()


def call(*args):
    return run(["bash", SCRIPT, *args], user="user", cwd="/home/user", timeout=30)


def memory_percent():
    info = {}
    for line in open("/proc/meminfo"):
        key, value = line.split(":", 1)
        info[key] = int(value.split()[0])
    return (info["MemTotal"] - info["MemAvailable"]) * 100 // info["MemTotal"]


def disk_percent(path):
    out = run(["df", "--output=pcent", path]).out.strip().splitlines()[-1]
    return int(re.sub(r"\D", "", out))


def parse(out):
    return [l.rstrip() for l in out.strip().splitlines()]


@c.test("health.sh exists")
def _():
    ensure(os.path.isfile(SCRIPT), f"Expected {SCRIPT} but it was not found")
    return f"Found {SCRIPT}"


@c.test("the script uses the required variables, functions, loop and conditions", requires=["health.sh exists"])
def _():
    text = read(SCRIPT)
    ensure(re.search(r"^\s*THRESHOLD=", text, re.M), "Expected a THRESHOLD variable")
    ensure(re.search(r"""^\s*PATHS_TO_CHECK=["']?/ /var /tmp["']?\s*$""", text, re.M), 'Expected PATHS_TO_CHECK="/ /var /tmp"')
    for fn in ["show_uptime", "check_memory", "check_disk"]:
        ensure(re.search(rf"^\s*(function\s+{fn}\b|{fn}\s*\(\s*\))", text, re.M), f"Expected a function named {fn}")
        calls = [l for l in text.splitlines() if re.search(rf"\b{fn}\b", l) and not re.search(rf"(function\s+{fn}|{fn}\s*\()", l)]
        ensure(calls, f"Expected the function {fn} to be called")
    ensure(re.search(r"\b(for|while|until)\b", text), "Expected a loop (for or while) in the script")
    ensure(re.search(r"\bif\b", text), "Expected if conditions in the script")
    return "Variables, three functions, a loop and conditions are present"


@c.test("the report has the required format", requires=["health.sh exists"])
def _():
    r = call("100")
    got = parse(r.out)
    ensure(len(got) == 7, f"Expected 7 output lines but found {len(got)}: {quote(r.out.strip(), 160)}")
    ensure(got[0] == "System Health Report", f"Expected the first line 'System Health Report' but found {quote(got[0])}")
    ensure(re.fullmatch(r"Uptime: up .+", got[1]), f"Expected 'Uptime: up ...' from uptime -p but found {quote(got[1])}")
    ensure(re.fullmatch(r"Memory: \d+% used", got[2]), f"Expected 'Memory: <N>% used' but found {quote(got[2])}")
    for line, path in zip(got[3:6], PATHS):
        ensure(re.fullmatch(rf"Disk {re.escape(path)}: \d+% used", line), f"Expected 'Disk {path}: <N>% used' but found {quote(line)}")
    ensure(re.fullmatch(r"Status: (OK|WARNING)", got[6]), f"Expected 'Status: OK' or 'Status: WARNING' but found {quote(got[6])}")
    return "All seven lines match the format"


@c.test("memory and disk numbers are correct", requires=["the report has the required format"])
def _():
    got = parse(call("100").out)
    mem = int(re.search(r"\d+", got[2]).group())
    real = memory_percent()
    ensure(abs(mem - real) <= 3, f"Expected memory near {real}% but found {mem}%")
    for line, path in zip(got[3:6], PATHS):
        disk = int(re.search(r"(\d+)%", line).group(1))
        want = disk_percent(path)
        ensure(abs(disk - want) <= 1, f"Expected {path} at {want}% but found {disk}%")
    return f"Memory {mem}% and disk values match the system"


@c.test("a low threshold gives WARNING and exit 1", requires=["the report has the required format"])
def _():
    r = call("1")
    ensure(parse(r.out)[-1:] == ["Status: WARNING"], f"Expected 'Status: WARNING' with threshold 1 but found {quote(r.out.strip()[-30:])}")
    ensure(r.code == 1, f"Expected exit status 1 for WARNING but found {r.code}")
    return "Threshold 1 gives WARNING and exit 1"


@c.test("a threshold above every value gives OK and exit 0", requires=["the report has the required format"])
def _():
    highest = max([memory_percent()] + [disk_percent(p) for p in PATHS])
    threshold = min(100, highest + 5)
    if highest + 5 > 100:
        return "Skipped: the system is too full to test OK"
    r = call(str(threshold))
    ensure(parse(r.out)[-1:] == ["Status: OK"], f"Expected 'Status: OK' with threshold {threshold} but found {quote(r.out.strip()[-30:])}")
    ensure(r.code == 0, f"Expected exit status 0 for OK but found {r.code}")
    return f"Threshold {threshold} gives OK and exit 0"


@c.test("the default threshold is 80", requires=["the report has the required format"])
def _():
    highest = max([memory_percent()] + [disk_percent(p) for p in PATHS])
    r = call()
    want = "WARNING" if highest >= 80 else "OK"
    ensure(parse(r.out)[-1:] == [f"Status: {want}"], f"Expected 'Status: {want}' with the default threshold 80 but found {quote(r.out.strip()[-30:])}")
    return f"Default threshold gives {want}"


@c.test("invalid thresholds are rejected with exit 2", requires=["health.sh exists"])
def _():
    for bad in ["abc", "0", "150", "-5"]:
        r = call(bad)
        ensure(r.code == 2, f"Expected exit status 2 for threshold {quote(bad)} but found {r.code}")
        want = "Error: threshold must be a number between 1 and 100"
        ensure(r.err.strip() == want, f"Expected {quote(want)} on standard error for {quote(bad)} but found {quote(r.err.strip())}")
    return "abc, 0, 150 and -5 are rejected"


c.run()
