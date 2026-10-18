import hashlib
import json
import re

from labcheck import Checker, context, ensure, http, lines, quote, run

ctx = context()
UNIT = "/etc/systemd/system/inventory.service"
c = Checker()


def prop(name, unit="inventory.service"):
    return run(["systemctl", "show", "-p", name, "--value", unit]).out.strip()


@c.test("the unit file was not changed")
def _():
    data = open(UNIT, "rb").read()
    ensure(hashlib.sha256(data).hexdigest() == ctx.get("unit_sum"), f"Expected {UNIT} to be unchanged; fix the cause instead of the unit")
    ensure(not run("ls /etc/systemd/system/inventory.service.d 2>/dev/null").out.strip(), "Expected no drop-in overrides for inventory.service")
    return "inventory.service is as installed"


@c.test("inventory is active (running)")
def _():
    state = prop("ActiveState")
    sub = prop("SubState")
    ensure(state == "active" and sub == "running", f"Expected inventory to be active (running) but found {state} ({sub})")
    return "inventory is active (running)"


@c.test("inventory is enabled at boot")
def _():
    found = run(["systemctl", "is-enabled", "inventory.service"]).out.strip()
    ensure(found == "enabled", f"Expected inventory to be enabled but found {found or 'disabled'}")
    return "inventory is enabled"


@c.test("the health endpoint answers on port 8090", requires=["inventory is active (running)"])
def _():
    status, body = 0, ""
    for _ in range(5):
        status, body = http("http://localhost:8090/health", timeout=5)
        if status == 200:
            break
        run("sleep 1")
    ensure(status == 200, f"Expected HTTP 200 from http://localhost:8090/health but found {status or 'no answer'}")
    try:
        data = json.loads(body)
    except ValueError:
        data = {}
    ensure(data.get("service") == "inventory" and data.get("status") == "ok", f"Expected the inventory service to answer, but port 8090 returned {quote(body)}")
    return 'Port 8090 returns {"service": "inventory", "status": "ok"}'


@c.test("the service keeps its port and data directory")
def _():
    conf = open("/etc/inventory/inventory.conf").read()
    ensure(re.search(r"^PORT=8090\s*$", conf, re.M), "Expected PORT=8090 in /etc/inventory/inventory.conf")
    ensure(re.search(r"^DATA_DIR=/var/lib/inventory\s*$", conf, re.M), "Expected DATA_DIR=/var/lib/inventory in /etc/inventory/inventory.conf")
    return "Port 8090 and /var/lib/inventory are kept"


def answers():
    out = {}
    for line in lines("/home/user/diagnosis.txt", "the file /home/user/diagnosis.txt"):
        if "=" in line:
            k, v = line.split("=", 1)
            out[k.strip()] = v.strip()
    return out


@c.test("diagnosis.txt records the status command")
def _():
    cmd = answers().get("status_command", "")
    ensure(cmd, "Expected a status_command= line in diagnosis.txt")
    ensure(re.search(r"\bsystemctl\b.*\bstatus\b.*\binventory(\.service)?\b", cmd), f"Expected a systemctl status command for inventory but found {quote(cmd)}")
    return f"status_command is {quote(cmd)}"


@c.test("diagnosis.txt records the logs command")
def _():
    cmd = answers().get("logs_command", "")
    ensure(cmd, "Expected a logs_command= line in diagnosis.txt")
    ok = re.search(r"\bjournalctl\b", cmd) and re.search(r"(-u\s*|--unit[= ])inventory(\.service)?\b", cmd)
    ensure(ok, f"Expected a journalctl command for the inventory unit (journalctl -u inventory) but found {quote(cmd)}")
    return f"logs_command is {quote(cmd)}"


@c.test("diagnosis.txt names the correct root cause")
def _():
    got = answers().get("root_cause", "").upper()
    ensure(got, "Expected a root_cause= line in diagnosis.txt")
    ensure(got == ctx.get("cause"), f"Expected the root cause shown in the logs, but {quote(got)} is not it")
    return f"The root cause was {got}"


c.run()
