import json
import os
import re

from labcheck import Checker, context, ensure, http, quote, read, run

DOCKERFILE = "/home/user/site/Dockerfile"
ctx = context()
c = Checker()


def instructions():
    out = []
    for line in read(DOCKERFILE).splitlines():
        s = line.strip()
        if s and not s.startswith("#"):
            word, _, rest = s.partition(" ")
            out.append((word.upper(), rest.strip()))
    return out


@c.test("the Dockerfile uses FROM, WORKDIR, COPY and CMD")
def _():
    ensure(os.path.isfile(DOCKERFILE), f"Expected {DOCKERFILE} but it was not found")
    found = [w for w, _ in instructions()]
    for word in ["FROM", "WORKDIR", "COPY", "CMD"]:
        ensure(word in found, f"Expected a {word} instruction in the Dockerfile")
    ensure(found[0] == "FROM", f"Expected the first instruction to be FROM but found {found[0]}")
    return "FROM, WORKDIR, COPY and CMD are present"


@c.test("the instructions have the required values", requires=["the Dockerfile uses FROM, WORKDIR, COPY and CMD"])
def _():
    ins = dict(instructions())
    want_from = os.environ.get("IMAGE_PYTHON", "")
    ensure(ins["FROM"].split()[0] == want_from, f"Expected FROM {want_from} but found FROM {ins['FROM']}")
    ensure(ins["WORKDIR"].rstrip("/") == "/srv/site", f"Expected WORKDIR /srv/site but found {quote(ins['WORKDIR'])}")
    ensure("index.html" in ins["COPY"], f"Expected COPY to copy index.html but found {quote(ins['COPY'])}")
    try:
        cmd = json.loads(ins["CMD"])
    except ValueError:
        cmd = None
    ensure(isinstance(cmd, list), f"Expected CMD in exec form, a JSON array, but found {quote(ins['CMD'])}")
    ensure(cmd[:3] in (["python3", "-m", "http.server"], ["python", "-m", "http.server"]) and "8000" in cmd, f"Expected CMD to start http.server on port 8000 but found {quote(ins['CMD'])}")
    return "Base image, working directory, copy and command are correct"


@c.test("the image my-site:1.0 was built")
def _():
    r = run(["docker", "image", "inspect", "my-site:1.0"])
    ensure(r.ok, "Expected an image tagged my-site:1.0 but docker images does not show it")
    cfg = json.loads(r.out)[0]["Config"]
    ensure(cfg.get("WorkingDir") == "/srv/site", f"Expected the image's working directory to be /srv/site but found {quote(cfg.get('WorkingDir'))}")
    ensure("http.server" in " ".join(cfg.get("Cmd") or []), "Expected the image's command to start http.server. Rebuild after fixing the Dockerfile.")
    return "my-site:1.0 exists with the right working directory and command"


@c.test("the container site runs my-site:1.0 on port 8081", requires=["the image my-site:1.0 was built"])
def _():
    r = run(["docker", "inspect", "site"])
    ensure(r.ok, "Expected a container named site")
    info = json.loads(r.out)[0]
    ensure(info["State"]["Running"], f"Expected site to be running but it is {info['State']['Status']}")
    ensure(info["Config"]["Image"] in ("my-site:1.0", "docker.io/library/my-site:1.0"), f"Expected site to run my-site:1.0 but it runs {info['Config']['Image']}")
    ports = [b.get("HostPort") for b in (info["HostConfig"].get("PortBindings") or {}).get("8000/tcp") or []]
    ensure("8081" in ports, "Expected container port 8000 to be published on host port 8081")
    return "site runs my-site:1.0 with 8081 -> 8000"


@c.test("http://localhost:8081 serves the page", requires=["the container site runs my-site:1.0 on port 8081"])
def _():
    status, body = http("http://localhost:8081/", timeout=10)
    ensure(status == 200, f"Expected HTTP 200 from http://localhost:8081 but found {status or 'no answer'}")
    ensure(ctx.get("token", "missing") in body, "Expected the page from /home/user/site/index.html but got different content")
    return "The page is served from the container"


c.run()
