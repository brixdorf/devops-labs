import json

from labcheck import Checker, context, ensure, lines, quote, read, run

D = "/home/user/tf/inventory"
ctx = context()
c = Checker()


def tf(*args):
    return run(["terraform", f"-chdir={D}", *args], user="user", timeout=120)


def git(*args):
    return run(["git", "-C", D, *args], user="user")


def resources():
    data = json.loads(tf("show", "-json").out or "{}")
    return {x["address"]: x["values"] for x in (data.get("values") or {}).get("root_module", {}).get("resources", [])}


@c.test("state-before.txt lists the state")
def _():
    rows = [l.strip() for l in lines(f"{D}/state-before.txt")]
    ensure(sorted(rows) == ["local_file.report", "random_integer.port"], f"Expected the output of terraform state list but found {rows}")
    return "Both resources were listed"


@c.test("plan.txt shows the report being replaced")
def _():
    text = read(f"{D}/plan.txt")
    ensure("local_file.report must be replaced" in text, "Expected the plan to say local_file.report must be replaced. Save terraform plan -no-color after editing main.tf.")
    ensure("Plan: 1 to add, 0 to change, 1 to destroy" in text, "Expected the summary 'Plan: 1 to add, 0 to change, 1 to destroy'")
    return "The plan replaces local_file.report"


@c.test("explain.txt matches the plan and the state")
def _():
    got = {}
    for line in lines(f"{D}/explain.txt", f"the file {D}/explain.txt"):
        if "=" in line:
            k, v = line.split("=", 1)
            got[k.strip()] = v.strip().lower()
    want = {"report_action": "replace", "port_action": "no-op", "state_file": "terraform.tfstate", "resources_in_state": "2"}
    for k, v in want.items():
        ensure(k in got, f"Expected a line '{k}=...' in explain.txt")
        ok = got[k] == v or (k == "port_action" and got[k] in ("no-op", "none", "noop", "no change"))
        ensure(ok, f"{k} is not {quote(got[k])}. Read the plan and the hint again.")
    return "The explanation is correct"


@c.test("the change was applied and the port kept its value")
def _():
    res = resources()
    report = res.get("local_file.report", {})
    ensure(report.get("content") == "inventory report v2\n", f"Expected the applied content 'inventory report v2' but found {quote(report.get('content', ''))}")
    ensure(read(f"{D}/report.txt") == "inventory report v2\n", "Expected report.txt on disk to contain the new content")
    ensure(str(res.get("random_integer.port", {}).get("result")) == ctx["port"], "Expected random_integer.port to keep its original value")
    return f"report.txt replaced, port still {ctx['port']}"


@c.test(".gitignore excludes state, plugins and secrets")
def _():
    for path in ["terraform.tfstate", "terraform.tfstate.backup", ".terraform/x", "secrets.auto.tfvars"]:
        r = git("check-ignore", "-q", path)
        ensure(r.ok, f"Expected {path.split('/')[0]} to be ignored by .gitignore")
    return "State, .terraform/ and secrets are ignored"


@c.test("Git tracks the configuration but no state or secrets", requires=[".gitignore excludes state, plugins and secrets"])
def _():
    tracked = git("ls-files").out.split()
    bad = [f for f in tracked if f.endswith(".tfstate") or ".tfstate." in f or f.startswith(".terraform/") or f == "secrets.auto.tfvars"]
    ensure(not bad, f"Expected no state, plugin or secret files in Git but found {', '.join(bad)}")
    ensure(".gitignore" in tracked, "Expected .gitignore to be committed")
    committed = git("show", "HEAD:main.tf").out
    ensure("inventory report v2" in committed, "Expected the main.tf change to be committed")
    ensure(not git("status", "--porcelain", "main.tf", ".gitignore").out.strip(), "Expected main.tf and .gitignore to be fully committed")
    history = git("log", "-p", "--all").out
    ensure(ctx["token"] not in history, "Expected the API token never to be committed")
    return "Only configuration is in Git"


c.run()
