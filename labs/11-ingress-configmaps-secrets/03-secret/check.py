import base64
import os

from labcheck import Checker, context, ensure, k8s, read, run

PW = context().get("password", "")
MANIFEST = "/home/user/secret/app.yaml"
c = Checker()


@c.test("db-credentials holds the username and password")
def _():
    s = k8s("get secret db-credentials")
    ensure(s, "Expected a Secret named db-credentials")
    ensure(s.get("type") == "Opaque", f"Expected type Opaque but found {s.get('type')}")
    data = {k: base64.b64decode(v).decode() for k, v in (s.get("data") or {}).items()}
    ensure(data.get("username") == "appuser", f"Expected username appuser but found {data.get('username')!r}")
    got = data.get("password", "")
    ensure(got.strip() == PW, "Expected the password from db-password.txt in the key password")
    ensure(got == PW, "Expected the password without a trailing newline")
    return "username and password are stored"


@c.test("app.yaml does not contain the password")
def _():
    ensure(os.path.isfile(MANIFEST), f"Expected {MANIFEST} but it was not found")
    text = read(MANIFEST)
    encoded = base64.b64encode(PW.encode()).decode()
    ensure(PW not in text, "Expected no plain-text password in app.yaml")
    ensure(encoded not in text, "Expected no base64-encoded password in app.yaml")
    return "No copy of the password in the manifest"


@c.test("secret-demo references the Secret for both variables and a volume")
def _():
    d = k8s("get deployment secret-demo")
    ensure(d, "Expected a deployment named secret-demo")
    spec = d["spec"]["template"]["spec"]
    ctr = next((x for x in spec["containers"] if x["name"] == "app"), None)
    ensure(ctr, "Expected a container named app")
    refs = {e["name"]: (e.get("valueFrom") or {}).get("secretKeyRef") or {} for e in ctr.get("env", [])}
    for var, key in [("DB_USER", "username"), ("DB_PASSWORD", "password")]:
        ref = refs.get(var, {})
        ensure(ref.get("name") == "db-credentials" and ref.get("key") == key, f"Expected {var} to come from secretKeyRef db-credentials/{key}")
    vols = {v["name"] for v in spec.get("volumes", []) if (v.get("secret") or {}).get("secretName") == "db-credentials"}
    mounts = [m for m in ctr.get("volumeMounts", []) if m["name"] in vols and m["mountPath"].rstrip("/") == "/etc/db-credentials"]
    ensure(mounts, "Expected the Secret mounted as a volume at /etc/db-credentials")
    ensure(mounts[0].get("readOnly"), "Expected the Secret volume to be mounted read-only")
    return "DB_USER, DB_PASSWORD and the volume use db-credentials"


@c.test("the running pod sees the credential", requires=["secret-demo references the Secret for both variables and a volume"])
def _():
    r = run(["kubectl", "exec", "deploy/secret-demo", "-c", "app", "--", "sh", "-c", 'echo "$DB_USER|$DB_PASSWORD"; cat /etc/db-credentials/password'], timeout=60)
    ensure(r.ok, f"Expected a running secret-demo pod: {r.err.strip()[:150]}")
    first, _, rest = r.out.partition("\n")
    ensure(first == f"appuser|{PW}", "Expected DB_USER and DB_PASSWORD to hold the credential inside the pod")
    ensure(rest.strip() == PW, "Expected /etc/db-credentials/password to hold the password")
    return "Environment and mounted file both hold the credential"


c.run()
