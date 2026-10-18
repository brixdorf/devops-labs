import json
import re

from labcheck import Checker, ensure, lines, quote, run

c = Checker()
ANSWERS = {"Q1": "B", "Q2": "A", "Q3": "C", "Q4": "B"}


def kv(path):
    out = {}
    for line in lines(path, f"the file {path}"):
        if "=" in line:
            k, v = line.split("=", 1)
            out[k.strip()] = v.strip()
    return out


def facts():
    addrs = json.loads(run(["ip", "-j", "-4", "addr", "show"]).out)
    iface = next(a for a in addrs if a["ifname"] != "lo" and a.get("addr_info"))
    info = iface["addr_info"][0]
    routes = json.loads(run(["ip", "-j", "-4", "route", "show", "default"]).out)
    gateway = routes[0]["gateway"] if routes else ""
    ports = set()
    for line in run(["ss", "-H", "-tln"]).out.splitlines():
        local = line.split()[3]
        ports.add(int(local.rsplit(":", 1)[1]))
    return {
        "interface": iface["ifname"],
        "ip_address": info["local"],
        "prefix_length": str(info["prefixlen"]),
        "default_gateway": gateway,
        "listening_ports": ",".join(str(p) for p in sorted(ports)),
    }


REPORT = "/home/user/network-report.txt"
real = facts()

for key, label in [
    ("interface", "the interface name"),
    ("ip_address", "the IPv4 address"),
    ("prefix_length", "the prefix length"),
    ("default_gateway", "the default gateway"),
    ("listening_ports", "the listening TCP ports"),
]:

    @c.test(f"network-report.txt has {label}")
    def _(key=key):
        got = kv(REPORT).get(key)
        ensure(got is not None, f"Expected a line '{key}=...' in {REPORT}")
        if key == "listening_ports":
            got = ",".join(str(p) for p in sorted(int(x) for x in re.findall(r"\d+", got)))
        if key == "prefix_length":
            got = got.lstrip("/")
        ensure(got == real[key], f"Expected {quote(real[key])} but found {quote(got)}")
        return f"{key} is {real[key]}"


COMMANDS = "/home/user/commands.txt"
PATTERNS = {
    "ip_command": (r"\bip\s+(-\S+\s+)*a(ddr(ess)?)?\b|\bifconfig\b|\bip\s+-br\s+a", "a command that shows addresses, such as 'ip addr show'"),
    "route_command": (r"\bip\s+(-\S+\s+)*r(oute)?\b|\broute\s+-n\b|\broute\b|\bnetstat\s+-\S*r", "a command that shows routes, such as 'ip route'"),
    "ports_command": (r"\bss\s+-\S*l|\bnetstat\s+-\S*l|\blsof\s+-i", "a command that lists listening sockets, such as 'ss -tln'"),
}

for key, (pattern, want) in PATTERNS.items():

    @c.test(f"commands.txt records the {key.split('_')[0]} command")
    def _(key=key, pattern=pattern, want=want):
        got = kv(COMMANDS).get(key, "")
        ensure(got, f"Expected a line '{key}=...' in {COMMANDS}")
        ensure(re.search(pattern, got), f"Expected {want} but found {quote(got)}")
        return f"{key} is {quote(got)}"


@c.test("interpretation.txt answers all four questions correctly")
def _():
    got = {}
    for line in lines("/home/user/interpretation.txt", "the file /home/user/interpretation.txt"):
        m = re.fullmatch(r"\s*(Q\d)\s*=\s*([ABC])\s*", line, re.I)
        ensure(m, f"Expected lines like 'Q1=B' but found {quote(line)}")
        got[m.group(1).upper()] = m.group(2).upper()
    for q, a in ANSWERS.items():
        ensure(q in got, f"Expected an answer for {q}")
        ensure(got[q] == a, f"{q}: {got[q]} is not correct. Read the question again and compare it with what you saw.")
    return "All four answers are correct"


c.run()
