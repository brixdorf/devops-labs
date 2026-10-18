import json
import os
from datetime import datetime, timezone

from labcheck import Checker, ensure, quote, read, run

c = Checker()


def parse_time(value):
    value = value.strip().replace("Z", "+00:00")
    if "." in value:
        head, tail = value.split(".", 1)
        frac = "".join(ch for ch in tail if ch.isdigit())[:6]
        zone = tail[len("".join(ch for ch in tail if ch.isdigit())):]
        value = f"{head}.{frac}{zone}"
    return datetime.fromisoformat(value)


def db():
    r = run(["docker", "inspect", "db"])
    return json.loads(r.out)[0] if r.ok else None


def sql(query):
    return run(["docker", "exec", "db", "psql", "-U", "postgres", "-tAc", query], timeout=30)


@c.test("the volume pgdata exists")
def _():
    ensure(run(["docker", "volume", "inspect", "pgdata"]).ok, "Expected a volume named pgdata but docker volume ls does not show it")
    return "pgdata exists"


@c.test("db runs PostgreSQL with pgdata mounted", requires=["the volume pgdata exists"])
def _():
    info = db()
    ensure(info, "Expected a container named db")
    ensure(info["State"]["Running"], f"Expected db to be running but it is {info['State']['Status']}")
    want = os.environ.get("IMAGE_POSTGRES", "")
    ensure(info["Config"]["Image"] in (want, f"docker.io/library/{want}"), f"Expected db to run {want} but it runs {info['Config']['Image']}")
    mounts = [m for m in info["Mounts"] if m.get("Type") == "volume" and m.get("Name") == "pgdata"]
    ensure(mounts, "Expected the volume pgdata to be mounted in db")
    ensure(mounts[0]["Destination"] == "/var/lib/postgresql", f"Expected pgdata mounted at /var/lib/postgresql but it is at {mounts[0]['Destination']}")
    return "db uses pgdata at /var/lib/postgresql"


@c.test("the students table has the three sample rows", requires=["db runs PostgreSQL with pgdata mounted"])
def _():
    r = sql("SELECT string_agg(name, ',' ORDER BY id) FROM students")
    ensure(r.ok, f"Expected a table named students: {r.text[:150]}")
    ensure(r.out.strip() == "Ada,Linus,Grace", f"Expected the rows Ada, Linus and Grace but found {quote(r.out.strip())}")
    return "Ada, Linus and Grace are in the table"


@c.test("db was recreated after the data was inserted", requires=["the students table has the three sample rows"])
def _():
    inserted = parse_time(sql("SELECT to_char(max(created_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.US\"+00:00\"') FROM students").out)
    created = parse_time(db()["Created"])
    ensure(created > inserted, "Expected the db container to be removed and created again after the data was inserted")
    return "The current db container is newer than the data, and the data survived"


@c.test("student-count.txt shows 3")
def _():
    text = read("/home/user/student-count.txt", "the file /home/user/student-count.txt").strip()
    ensure(text == "3", f"Expected 3 but found {quote(text)}")
    return "The count query returned 3"


c.run()
