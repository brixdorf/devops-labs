import hashlib
import os
import re

from labcheck import Checker, context, ensure, read, quote

HOME = "/home/user"
P = f"{HOME}/project"
IN = f"{HOME}/incoming"
ctx = context()
LOGS = ctx.get("logs", "").split(",")
app_sum, conf_sum = (ctx.get("sums", ",").split(",") + ["", ""])[:2]
c = Checker()


def sha(path):
    return hashlib.sha256(open(path, "rb").read()).hexdigest()


def walk(base, suffix):
    found = []
    for root, _, files in os.walk(base):
        found += [os.path.join(root, f) for f in files if f.endswith(suffix)]
    return found


@c.test("project has app, logs and config directories")
def _():
    for sub in ["app", "logs", "config"]:
        ensure(os.path.isdir(f"{P}/{sub}"), f"Expected the directory {P}/{sub} but it was not found")
    return "The project layout exists"


@c.test("app.py was copied, not moved")
def _():
    ensure(os.path.isfile(f"{P}/app/app.py"), f"Expected {P}/app/app.py but it was not found")
    ensure(os.path.isfile(f"{IN}/app.py"), f"Expected the original {IN}/app.py to still exist (copy, do not move)")
    ensure(sha(f"{P}/app/app.py") == app_sum, "Expected the copy of app.py to be identical to the original")
    return "app.py is in project/app and still in incoming"


@c.test("settings.conf was moved")
def _():
    ensure(os.path.isfile(f"{P}/config/settings.conf"), f"Expected {P}/config/settings.conf but it was not found")
    ensure(not os.path.exists(f"{IN}/settings.conf"), f"Expected settings.conf to be gone from {IN} after the move")
    ensure(sha(f"{P}/config/settings.conf") == conf_sum, "Expected settings.conf to be unchanged")
    return "settings.conf is in project/config only"


@c.test("every log file was moved into project/logs")
def _():
    left = walk(IN, ".log")
    ensure(not left, f"Expected no .log files in incoming but found {', '.join(sorted(left))}")
    present = sorted(os.listdir(f"{P}/logs")) if os.path.isdir(f"{P}/logs") else []
    missing = [n for n in LOGS if n not in present]
    ensure(not missing, f"Expected {', '.join(missing)} in {P}/logs but it was not found")
    return f"All {len(LOGS)} log files are in project/logs"


@c.test("search-result.txt names the log that contains 'disk full'")
def _():
    text = read(f"{P}/search-result.txt").strip()
    ensure(text, "Expected a file name in search-result.txt but it is empty")
    name = os.path.basename(text.splitlines()[0].strip())
    ensure(len(text.splitlines()) == 1, f"Expected only the file name but found {len(text.splitlines())} lines")
    ensure(name == ctx.get("target"), f"Expected {quote(ctx.get('target'))} but found {quote(text)}")
    return f"{name} contains 'disk full'"


@c.test("all .tmp files were deleted and other files kept")
def _():
    left = walk(IN, ".tmp")
    ensure(not left, f"Expected no .tmp files in incoming but found {', '.join(sorted(left))}")
    for keep in [f"{IN}/README.txt", f"{IN}/scratch/keep.txt"]:
        ensure(os.path.isfile(keep), f"Expected {keep} to be kept but it was deleted")
    return "Only the .tmp files were deleted"


@c.test("listing.txt holds a long listing of project/logs")
def _():
    text = read(f"{P}/listing.txt")
    rows = [l for l in text.splitlines() if re.match(r"^[-dl][rwxsStT-]{9}[.+@]?\s", l)]
    ensure(rows, "Expected long listing lines (like '-rw-r--r-- 1 user user ...') but found none")
    for name in LOGS:
        ensure(any(r.split()[-1] == name for r in rows), f"Expected the listing to include {name}")
    return f"The listing shows {len(rows)} entries with permissions and owners"


c.run()
