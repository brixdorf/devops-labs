import json
import os
import re

from labcheck import Checker, context, ensure, http, lines, quote, read, run

DIR = "/home/user/status-api"
ctx = context()
c = Checker()


def image_files():
    r = run(["docker", "run", "--rm", "--entrypoint", "find", "status-api:2.0", "/app", "-mindepth", "1"], timeout=60)
    return r.out.split() if r.ok else None


@c.test(".dockerignore lists the three exclusions")
def _():
    path = f"{DIR}/.dockerignore"
    ensure(os.path.isfile(path), f"Expected {path} but it was not found")
    pats = [l.strip() for l in lines(path) if not l.strip().startswith("#")]
    ensure(any(p in ("secrets.env", "/secrets.env", "**/secrets.env") for p in pats), "Expected a pattern for secrets.env")
    ensure(any(p in ("*.log", "**/*.log", "/*.log") for p in pats), "Expected a pattern for *.log files")
    ensure(any(p.rstrip("/").lstrip("/") in ("notes", "notes/**", "**/notes") for p in pats), "Expected a pattern for the notes/ folder")
    return "secrets.env, *.log and notes/ are excluded"


@c.test("the Dockerfile sets APP_ENV=production with ENV")
def _():
    text = read(f"{DIR}/Dockerfile")
    ensure(re.search(r"^\s*ENV\s+APP_ENV(=|\s+)[\"']?production[\"']?\s*$", text, re.M | re.I), "Expected an instruction 'ENV APP_ENV=production' in the Dockerfile")
    ensure(os.path.isfile(f"{DIR}/secrets.env"), "Expected secrets.env to stay in the project folder")
    return "ENV APP_ENV=production is in the Dockerfile"


@c.test("status-api:2.0 contains the app but no excluded files")
def _():
    files = image_files()
    ensure(files is not None, "Expected an image tagged status-api:2.0 but it was not found")
    names = [f[len("/app/"):] for f in files]
    ensure("app.py" in names, "Expected /app/app.py in the image")
    bad = [n for n in names if n == "secrets.env" or n.endswith(".log") or n == "notes" or n.startswith("notes/")]
    ensure(not bad, f"Expected no excluded files in the image but found {', '.join(bad)}")
    return "The image contains app.py and no secrets, logs or notes"


@c.test("the image has APP_ENV=production", requires=["status-api:2.0 contains the app but no excluded files"])
def _():
    env = json.loads(run(["docker", "image", "inspect", "status-api:2.0"]).out)[0]["Config"].get("Env") or []
    ensure("APP_ENV=production" in env, f"Expected APP_ENV=production in the image environment but found {', '.join(env)}")
    return "APP_ENV=production is part of the image"


@c.test("the container status-api answers on port 8082 with env production", requires=["the image has APP_ENV=production"])
def _():
    r = run(["docker", "inspect", "status-api"])
    ensure(r.ok, "Expected a container named status-api")
    info = json.loads(r.out)[0]
    ensure(info["State"]["Running"], "Expected the status-api container to be running")
    ensure(info["Config"]["Image"] in ("status-api:2.0", "docker.io/library/status-api:2.0"), f"Expected the container to run status-api:2.0 but it runs {info['Config']['Image']}")
    status, body = http("http://localhost:8082/", timeout=10)
    ensure(status == 200, f"Expected HTTP 200 from http://localhost:8082 but found {status or 'no answer'}")
    try:
        data = json.loads(body)
    except ValueError:
        data = {}
    ensure(data.get("env") == "production", f"Expected env production but found {quote(body)}")
    return 'curl returns {"app": "status-api", "env": "production"}'


@c.test("explain.txt names the correct statements")
def _():
    got = {}
    for line in lines(f"{DIR}/explain.txt", "the file /home/user/status-api/explain.txt"):
        if "=" in line:
            k, v = line.split("=", 1)
            got[k.strip().lower()] = v.strip().upper()
    for key in ["dockerignore", "env"]:
        ensure(key in got, f"Expected a line '{key}=...' in explain.txt")
        ensure(got[key] == ctx[key], f"{got[key]} does not explain {key}. Read the statements again.")
    return "Both additions are explained correctly"


c.run()
