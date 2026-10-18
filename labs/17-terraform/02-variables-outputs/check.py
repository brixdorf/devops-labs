import json
import os
import re

from labcheck import Checker, ensure, quote, read, run

D = "/home/user/tf/app-config"
c = Checker()


def tf(*args):
    return run(["terraform", f"-chdir={D}", *args], user="user", timeout=120)


def state():
    r = tf("show", "-json")
    ensure(r.ok, "Expected an applied configuration. Run terraform apply -var-file=staging.tfvars.")
    data = json.loads(r.out or "{}")
    res = (data.get("values") or {}).get("root_module", {}).get("resources", [])
    return data, {x["address"]: x["values"] for x in res}


def config_vars():
    text = read(f"{D}/variables.tf")
    found = {}
    for m in re.finditer(r'variable\s+"(\w+)"\s*\{(.*?)\n\}', text, re.S):
        found[m.group(1)] = m.group(2)
    return found


@c.test("variables.tf declares the three typed variables")
def _():
    v = config_vars()
    for name, typ in [("environment", "string"), ("owner", "string"), ("replicas", "number")]:
        ensure(name in v, f"Expected a variable named {name}")
        ensure(re.search(rf"type\s*=\s*{typ}\b", v[name]), f"Expected {name} to have type = {typ}")
        ensure("description" in v[name], f"Expected {name} to have a description")
    ensure(re.search(r"default\s*=\s*1\b", v["replicas"]), "Expected replicas to default to 1")
    ensure("default" not in v["environment"] and "default" not in v["owner"], "Expected environment and owner to have no default")
    return "environment, owner and replicas are declared"


@c.test("staging.tfvars holds the staging values")
def _():
    text = read(f"{D}/staging.tfvars")
    ensure(re.search(r'^\s*environment\s*=\s*"staging"', text, re.M), 'Expected environment = "staging"')
    ensure(re.search(r'^\s*owner\s*=\s*"platform-team"', text, re.M), 'Expected owner = "platform-team"')
    ensure(re.search(r"^\s*replicas\s*=\s*3\b", text, re.M), "Expected replicas = 3")
    return "staging.tfvars is correct"


@c.test("the configuration was applied with the staging values", requires=["variables.tf declares the three typed variables", "staging.tfvars holds the staging values"])
def _():
    _, res = state()
    pet = res.get("random_pet.app")
    ensure(pet, "Expected random_pet.app in the state")
    ensure(pet.get("prefix") == "staging", f"Expected the prefix staging but found {pet.get('prefix')!r}")
    cfg = res.get("local_file.config")
    ensure(cfg, "Expected local_file.config in the state")
    want = f"environment=staging\nowner=platform-team\nreplicas=3\napp_name={pet['id']}\n"
    ensure(cfg.get("content") == want, f"Expected app.conf to contain the four lines but found {quote(cfg.get('content', ''), 120)}")
    ensure(read(f"{D}/app.conf") == want, "Expected app.conf on disk to match the configuration")
    return f"Applied as {pet['id']}"


@c.test("the outputs are declared and set", requires=["the configuration was applied with the staging values"])
def _():
    data, res = state()
    outs = (data.get("values") or {}).get("outputs", {})
    ensure("app_name" in outs and outs["app_name"]["value"] == res["random_pet.app"]["id"], "Expected the output app_name with the random_pet id")
    ensure("config_path" in outs and outs["config_path"]["value"].endswith("app.conf"), "Expected the output config_path with the file name")
    return "app_name and config_path are output"


@c.test("app-name.txt holds the raw output value", requires=["the outputs are declared and set"])
def _():
    want = state()[1]["random_pet.app"]["id"]
    got = read(f"{D}/app-name.txt").strip()
    ensure(got == want, f"Expected {want} (without quotes) but found {quote(got)}")
    return f"app-name.txt is {want}"


c.run()
