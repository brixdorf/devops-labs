"""Helpers for DevOps Labs checkers.

A checker registers test cases with Checker.test and calls Checker.run().
Each test returns a short success message, or raises Fail (through fail()
or ensure()) with a specific reason. The result is printed as one JSON line
that the platform reads.
"""
import base64
import grp
import json
import os
import pwd
import shlex
import subprocess
import sys
import traceback
import urllib.error
import urllib.request

MARKER = "@@DEVOPS_LABS_RESULT@@"
HOME = "/home/user"


class Fail(Exception):
    """A test case failed for a reason the student can act on."""


def fail(message):
    raise Fail(message)


def ensure(condition, message):
    if not condition:
        raise Fail(message)
    return condition


class Result:
    def __init__(self, code, out, err):
        self.code = code
        self.out = out
        self.err = err

    @property
    def ok(self):
        return self.code == 0

    @property
    def text(self):
        return (self.out + self.err).strip()


def run(cmd, user=None, timeout=60, input=None, cwd=None, env=None, login=False):
    """Runs a command. A string runs through bash. With user, runs as that user."""
    if isinstance(cmd, str):
        argv = ["bash", "-lc" if login else "-c", cmd]
    else:
        argv = list(cmd)
    if user:
        argv = ["runuser", "-u", user, "--"] + argv
    full_env = dict(os.environ)
    if user == "user":
        full_env.update({"HOME": HOME, "USER": "user", "LOGNAME": "user"})
    if env:
        full_env.update(env)
    try:
        p = subprocess.run(argv, input=input, capture_output=True, text=True, timeout=timeout, cwd=cwd, env=full_env)
        return Result(p.returncode, p.stdout, p.stderr)
    except subprocess.TimeoutExpired as exc:
        out = exc.stdout if isinstance(exc.stdout, str) else ""
        return Result(124, out, "timed out")


def exists(path):
    return os.path.lexists(path)


def read(path, what=None):
    """Returns a file's text, failing with a clear message when it is missing."""
    label = what or path
    if not os.path.exists(path):
        fail(f"Expected {label} but it was not found")
    if os.path.isdir(path):
        fail(f"Expected {label} to be a file but it is a directory")
    with open(path, encoding="utf-8", errors="replace") as fh:
        return fh.read()


def lines(path, what=None, keep_empty=False):
    text = read(path, what)
    out = [line.rstrip("\r") for line in text.split("\n")]
    if not keep_empty:
        out = [line for line in out if line.strip() != ""]
    return out


def owner(path):
    st = os.lstat(path)
    try:
        user = pwd.getpwuid(st.st_uid).pw_name
    except KeyError:
        user = str(st.st_uid)
    try:
        group = grp.getgrgid(st.st_gid).gr_name
    except KeyError:
        group = str(st.st_gid)
    return f"{user}:{group}"


def mode(path):
    return os.stat(path).st_mode & 0o7777


def http(url, method="GET", headers=None, data=None, auth=None, timeout=15):
    """Returns (status, body). Never raises for HTTP errors."""
    req = urllib.request.Request(url, method=method, headers=dict(headers or {}))
    if auth:
        token = base64.b64encode(f"{auth[0]}:{auth[1]}".encode()).decode()
        req.add_header("Authorization", f"Basic {token}")
    if data is not None:
        if not isinstance(data, (bytes, str)):
            data = json.dumps(data)
            req.add_header("Content-Type", "application/json")
        if isinstance(data, str):
            data = data.encode()
    try:
        with urllib.request.urlopen(req, data=data, timeout=timeout) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode("utf-8", errors="replace")
    except Exception as exc:  # connection refused, timeouts and so on
        return 0, str(exc)


def http_json(url, **kwargs):
    status, body = http(url, **kwargs)
    try:
        return status, json.loads(body)
    except ValueError:
        return status, None


def kubectl(args, timeout=60):
    """Runs kubectl and returns parsed JSON when -o json is requested."""
    argv = ["kubectl"] + (shlex.split(args) if isinstance(args, str) else list(args))
    r = run(argv, timeout=timeout)
    if "-o" in argv and "json" in argv:
        if not r.ok:
            return None
        try:
            return json.loads(r.out)
        except ValueError:
            return None
    return r


def gitea_api(path, method="GET", data=None):
    base = os.environ.get("GITEA_URL", "http://localhost:8801")
    auth = (os.environ.get("GITEA_USER", "student"), os.environ.get("GITEA_PASSWORD", "student@123!"))
    return http_json(f"{base}/api/v1{path}", method=method, data=data, auth=auth)


def context():
    path = os.environ.get("LAB_CONTEXT_FILE", "")
    if path and os.path.exists(path):
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    return {}


def quote(text, limit=80):
    text = str(text).replace("\n", "\\n")
    if len(text) > limit:
        text = text[: limit - 3] + "..."
    return f"'{text}'"


class Checker:
    def __init__(self):
        self.tests = []

    def test(self, name, requires=None):
        """Registers a test case. requires names earlier tests that must pass."""

        def register(fn):
            self.tests.append((name, fn, requires or []))
            return fn

        return register

    def run(self):
        results = []
        status_by_name = {}
        for name, fn, requires in self.tests:
            blocked = [r for r in requires if status_by_name.get(r) != "passed"]
            if blocked:
                entry = {"name": name, "status": "failed", "message": f"Not checked because '{blocked[0]}' did not pass"}
            else:
                try:
                    message = fn()
                    entry = {"name": name, "status": "passed", "message": message or "Passed"}
                except Fail as exc:
                    entry = {"name": name, "status": "failed", "message": str(exc)}
                except Exception as exc:  # a bug in the checker or an unexpected state
                    detail = traceback.format_exc(limit=2).strip().split("\n")[-1]
                    entry = {"name": name, "status": "error", "message": f"Checker error: {detail or exc}"}
            status_by_name[name] = entry["status"]
            results.append(entry)
        sys.stdout.write(MARKER + json.dumps({"tests": results}) + "\n")
        sys.stdout.flush()


def k8s(args, timeout=60):
    """Runs kubectl with -o json and returns the parsed object, or None."""
    argv = shlex.split(args) if isinstance(args, str) else list(args)
    r = run(["kubectl", *argv, "-o", "json"], timeout=timeout)
    if not r.ok:
        return None
    try:
        return json.loads(r.out)
    except ValueError:
        return None


def wait_until(fn, timeout=60, interval=2):
    """Calls fn until it returns a truthy value or the timeout passes."""
    import time

    deadline = time.time() + timeout
    while True:
        value = fn()
        if value or time.time() >= deadline:
            return value
        time.sleep(interval)


def in_cluster(command, image=None, timeout=60):
    """Runs a shell command in a short-lived busybox pod and returns its output."""
    import random

    image = image or os.environ.get("IMAGE_BUSYBOX", "busybox")
    name = f"labcheck-{random.randint(10000, 99999)}"
    r = run(["kubectl", "run", name, "--rm", "-i", "--restart=Never", "--quiet", f"--image={image}",
             "--pod-running-timeout=90s", "--", "sh", "-c", command], timeout=timeout + 90)
    return r


def json_in(text):
    """Returns the first JSON object found in text, or {}."""
    start = text.find("{")
    while start != -1:
        try:
            obj, _ = json.JSONDecoder().raw_decode(text[start:])
            if isinstance(obj, dict):
                return obj
        except ValueError:
            pass
        start = text.find("{", start + 1)
    return {}
