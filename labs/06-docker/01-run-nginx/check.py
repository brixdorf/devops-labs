import json

from labcheck import Checker, ensure, http, quote, read, run

c = Checker()


def inspect():
    r = run(["docker", "inspect", "web"])
    return json.loads(r.out)[0] if r.ok else None


@c.test("a container named web is running")
def _():
    info = inspect()
    ensure(info, "Expected a container named web but docker ps -a does not show one")
    ensure(info["State"]["Running"], f"Expected web to be running but it is {info['State']['Status']}")
    return "web is running"


@c.test("web runs the official nginx image", requires=["a container named web is running"])
def _():
    image = inspect()["Config"]["Image"]
    repo = image.split("@")[0].rsplit(":", 1)[0] if ":" in image.split("/")[-1] else image.split("@")[0]
    ensure(repo in ("nginx", "library/nginx", "docker.io/library/nginx"), f"Expected the nginx image but found {quote(image)}")
    return f"Image is {image}"


@c.test("host port 8080 is mapped to container port 80", requires=["a container named web is running"])
def _():
    bindings = inspect()["HostConfig"].get("PortBindings") or {}
    ports = [b.get("HostPort") for b in bindings.get("80/tcp") or []]
    ensure("8080" in ports, f"Expected container port 80 to be published on host port 8080 but found {bindings or 'no published ports'}")
    return "8080 -> 80/tcp"


@c.test("http://localhost:8080 returns the Nginx welcome page", requires=["host port 8080 is mapped to container port 80"])
def _():
    status, body = http("http://localhost:8080/", timeout=10)
    ensure(status == 200, f"Expected HTTP 200 from http://localhost:8080 but found {status or 'no answer'}")
    ensure("Welcome to nginx" in body, "Expected the Nginx welcome page")
    return "The welcome page is served"


@c.test("web-logs.txt holds the container logs with your request", requires=["a container named web is running"])
def _():
    text = read("/home/user/web-logs.txt", "the file /home/user/web-logs.txt")
    ensure('"GET / HTTP/1.1" 200' in text, "Expected an access log line like '\"GET / HTTP/1.1\" 200' from your curl request. Run curl first, then save the logs.")
    logs = run(["docker", "logs", "web"])
    first = next((l for l in text.splitlines() if '"GET / HTTP' in l), "")
    ensure(first and first in logs.out + logs.err, "Expected the saved lines to come from docker logs web")
    return "The logs show your GET request"


c.run()
