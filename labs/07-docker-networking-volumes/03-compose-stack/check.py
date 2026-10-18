import json
import os
import re
import time

from labcheck import Checker, ensure, http, lines, quote, read, run

DIR = "/home/user/stack"
c = Checker()


def config():
    r = run(["docker", "compose", "-f", f"{DIR}/compose.yaml", "--project-directory", DIR, "config", "--format", "json"], cwd=DIR)
    ensure(r.ok, f"Expected a valid compose.yaml: {r.err.strip()[:200]}")
    return json.loads(r.out)


@c.test("compose.yaml defines the web and redis services")
def _():
    ensure(os.path.isfile(f"{DIR}/compose.yaml"), f"Expected {DIR}/compose.yaml but it was not found")
    services = config().get("services", {})
    for name in ["web", "redis"]:
        ensure(name in services, f"Expected a service named {name}")
    return "web and redis are defined"


@c.test("web is built from ./app with port, environment and dependency", requires=["compose.yaml defines the web and redis services"])
def _():
    web = config()["services"]["web"]
    ctx = (web.get("build") or {}).get("context", "")
    ensure(ctx.rstrip("/") == f"{DIR}/app", f"Expected web to be built from ./app but found {quote(ctx or 'no build')}")
    ports = [(str(p.get("published")), int(p.get("target", 0))) for p in web.get("ports", [])]
    ensure(("8083", 8000) in ports, f"Expected port 8083 mapped to 8000 but found {ports or 'none'}")
    ensure((web.get("environment") or {}).get("REDIS_HOST") == "redis", "Expected the environment variable REDIS_HOST=redis on web")
    ensure("redis" in (web.get("depends_on") or {}), "Expected web to depend on redis")
    return "web: build ./app, 8083:8000, REDIS_HOST=redis, depends_on redis"


@c.test("redis uses the pinned image and the redis-data volume", requires=["compose.yaml defines the web and redis services"])
def _():
    cfg = config()
    redis = cfg["services"]["redis"]
    want = os.environ.get("IMAGE_REDIS", "")
    ensure(redis.get("image") == want, f"Expected image {want} but found {quote(redis.get('image', ''))}")
    vols = [(v.get("source"), v.get("target")) for v in redis.get("volumes", []) if v.get("type") == "volume"]
    ensure(("redis-data", "/data") in vols, f"Expected the named volume redis-data at /data but found {vols or 'none'}")
    ensure("redis-data" in (cfg.get("volumes") or {}), "Expected redis-data in the top-level volumes section")
    return "redis: pinned image, redis-data:/data"


@c.test("visits.txt shows two increasing visits")
def _():
    rows = lines(f"{DIR}/visits.txt", "the file /home/user/stack/visits.txt")
    nums = [int(m.group(1)) for m in (re.search(r"Visit number (\d+)", r) for r in rows) if m]
    ensure(len(nums) >= 2, f"Expected two responses with a visit number but found {len(nums)}")
    ensure(nums[-1] > nums[-2], f"Expected the visit number to increase but found {nums[-2]} then {nums[-1]}")
    return f"Visits went from {nums[-2]} to {nums[-1]}"


@c.test("web-logs.txt holds the web service logs")
def _():
    text = read(f"{DIR}/web-logs.txt", "the file /home/user/stack/web-logs.txt")
    ensure("web service listening on port 8000" in text, "Expected the web service's startup line in the logs")
    ensure('"GET / HTTP/1.1" 200' in text, "Expected the logged GET requests. Make the requests before saving the logs.")
    return "The logs show the startup line and your requests"


@c.test("the stack was shut down")
def _():
    r = run(["docker", "ps", "-a", "-q", "--filter", "label=com.docker.compose.project=stack"])
    ensure(not r.out.strip(), "Expected no containers of the stack project. Run docker compose down.")
    ensure(run(["docker", "volume", "inspect", "stack_redis-data"]).ok, "Expected the redis-data volume to be kept")
    return "No stack containers remain and the volume is kept"


@c.test("the stack starts and works when run again", requires=["web is built from ./app with port, environment and dependency", "redis uses the pinned image and the redis-data volume", "the stack was shut down"])
def _():
    base = ["docker", "compose", "-p", "labcheck", "-f", f"{DIR}/compose.yaml", "--project-directory", DIR]
    try:
        up = run(base + ["up", "-d", "--build"], cwd=DIR, timeout=300)
        ensure(up.ok, f"Expected docker compose up to succeed: {up.err.strip()[-200:]}")
        nums = []
        for _ in range(30):
            status, body = http("http://localhost:8083/", timeout=5)
            m = re.search(r"Visit number (\d+)", body)
            if status == 200 and m:
                nums.append(int(m.group(1)))
                if len(nums) == 2:
                    break
            else:
                time.sleep(1)
        ensure(len(nums) == 2 and nums[1] == nums[0] + 1, f"Expected two increasing visit numbers from a fresh start but got {nums or quote(body)}")
    finally:
        run(base + ["down", "-v"], cwd=DIR, timeout=120)
    return "A fresh start serves increasing visit numbers"


c.run()
