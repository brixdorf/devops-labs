import json
import os

from labcheck import Checker, ensure, lines, quote, read, run

D = "/home/user/tf/basics"
c = Checker()


def tf(*args, timeout=120):
    return run(["terraform", f"-chdir={D}", *args], user="user", timeout=timeout)


@c.test("main.tf exists and is formatted")
def _():
    ensure(os.path.isfile(f"{D}/main.tf"), f"Expected {D}/main.tf but it was not found")
    r = tf("fmt", "-check", "-diff")
    ensure(r.ok, f"Expected the configuration to be formatted. Run terraform fmt. {r.out.strip()[:120]}")
    return "main.tf is formatted"


@c.test("the working directory is initialized", requires=["main.tf exists and is formatted"])
def _():
    ensure(os.path.isfile(f"{D}/.terraform.lock.hcl"), "Expected .terraform.lock.hcl. Run terraform init.")
    lock = read(f"{D}/.terraform.lock.hcl")
    for p in ["hashicorp/local", "hashicorp/random"]:
        ensure(p in lock, f"Expected {p} in the lock file")
    return "init recorded both providers"


@c.test("the configuration is valid", requires=["the working directory is initialized"])
def _():
    r = tf("validate", "-json")
    data = json.loads(r.out or "{}")
    ensure(data.get("valid"), f"Expected terraform validate to succeed: {quote(r.text, 160)}")
    return "terraform validate succeeded"


@c.test("tfplan creates the two resources as described", requires=["the configuration is valid"])
def _():
    ensure(os.path.isfile(f"{D}/tfplan"), "Expected a saved plan file tfplan. Run terraform plan -out=tfplan.")
    r = tf("show", "-json", "tfplan")
    ensure(r.ok, f"Expected a readable plan: {r.err.strip()[:150]}")
    plan = json.loads(r.out)
    changes = {rc["address"]: rc for rc in plan.get("resource_changes", [])}
    ensure(set(changes) == {"random_pet.server", "local_file.greeting"}, f"Expected random_pet.server and local_file.greeting but found {sorted(changes)}")
    for addr, rc in changes.items():
        ensure(rc["change"]["actions"] == ["create"], f"Expected {addr} to be created but the plan says {rc['change']['actions']}")
    pet = changes["random_pet.server"]["change"]["after"]
    ensure(pet.get("length") == 2, f"Expected length = 2 but found {pet.get('length')}")
    cfg = plan["configuration"]["root_module"]["resources"]
    greeting = next(x for x in cfg if x["address"] == "local_file.greeting")
    refs = greeting["expressions"].get("content", {}).get("references", [])
    ensure("random_pet.server.id" in refs or "random_pet.server" in refs, "Expected the greeting content to use random_pet.server.id")
    fname = changes["local_file.greeting"]["change"]["after"].get("filename", "")
    ensure(fname.endswith("greeting.txt"), f"Expected the file greeting.txt but found {fname}")
    return "2 resources to create"


@c.test("the plan was not applied", requires=["the working directory is initialized"])
def _():
    ensure(not os.path.exists(f"{D}/greeting.txt"), "Expected greeting.txt not to exist yet: plan, but do not apply")
    return "Nothing was applied"


@c.test("plan.txt holds the readable plan")
def _():
    text = read(f"{D}/plan.txt")
    ensure("Plan: 2 to add, 0 to change, 0 to destroy" in text, "Expected the output of terraform show -no-color tfplan")
    return "plan.txt shows the plan summary"


@c.test("explain.txt explains the plan")
def _():
    got = {}
    for line in lines(f"{D}/explain.txt", f"the file {D}/explain.txt"):
        if "=" in line:
            k, v = line.split("=", 1)
            got[k.strip()] = v.strip()
    want = {"resources_to_add": "2", "create_symbol": "+", "greeting_address": "local_file.greeting", "lock_file": ".terraform.lock.hcl"}
    for k, v in want.items():
        ensure(k in got, f"Expected a line '{k}=...' in explain.txt")
        ensure(got[k] == v, f"Expected {k}={v} but found {quote(got[k])}")
    return "All four answers are correct"


c.run()
