import os
import re
import urllib.parse

from labcheck import Checker, ensure, http_json, quote, wait_until
from prom import query

GRAFANA = "http://grafana:3000"
AUTH = (os.environ.get("GRAFANA_USER", "admin"), os.environ.get("GRAFANA_PASSWORD", ""))
c = Checker()


def dashboard():
    status, found = http_json(f"{GRAFANA}/api/search?query={urllib.parse.quote('Orders API')}&type=dash-db", auth=AUTH)
    match = [d for d in (found or []) if d.get("title") == "Orders API"] if status == 200 else []
    if not match:
        return None
    status, data = http_json(f"{GRAFANA}/api/dashboards/uid/{match[0]['uid']}", auth=AUTH)
    return (data or {}).get("dashboard") if status == 200 else None


def panels():
    out = []
    for p in (dashboard() or {}).get("panels", []):
        out.append(p)
        out.extend(p.get("panels", []))
    return {p.get("title"): p for p in out if p.get("type") != "row"}


def expr_of(panel):
    exprs = [t.get("expr", "") for t in panel.get("targets", []) if t.get("expr")]
    return exprs[0] if exprs else ""


def flat(expr):
    return re.sub(r"\s+", "", expr)


@c.test("the Orders API dashboard is saved")
def _():
    d = dashboard()
    ensure(d, "Expected a saved dashboard titled 'Orders API'")
    return f"Found the dashboard (version {d.get('version')})"


CHECKS = {
    "Request rate": (lambda e: "rate(http_requests_total" in e and "http_request_duration" not in e and "5.." not in e, "a rate() of http_requests_total over all statuses"),
    "Error rate": (lambda e: "rate(http_requests_total" in e and re.search(r'status=~"5', e), 'a rate() of http_requests_total with status=~"5.."'),
    "Latency p95": (lambda e: "histogram_quantile(0.95" in e and "http_request_duration_seconds_bucket" in e and "le" in e, "histogram_quantile(0.95, ...) over http_request_duration_seconds_bucket by le"),
}

for title, (test, want) in CHECKS.items():

    @c.test(f"the {title} panel has the right query and data", requires=["the Orders API dashboard is saved"])
    def _(title=title, test=test, want=want):
        p = panels().get(title)
        ensure(p, f"Expected a panel titled {title!r}")
        ds = p.get("datasource") or {}
        ensure(not ds or ds.get("type") in ("prometheus", None) or ds.get("uid") == "prometheus", f"Expected {title} to use the Prometheus data source")
        e = expr_of(p)
        ensure(e, f"Expected a PromQL query in the {title} panel")
        ensure(test(flat(e)), f"Expected {want} but found {quote(e, 120)}")
        result = wait_until(lambda: query(e), timeout=60, interval=5)
        ensure(result, f"Expected the {title} query to return data from Prometheus")
        return f"{title}: {quote(e, 90)}"


@c.test("every panel explains what it indicates", requires=["the Orders API dashboard is saved"])
def _():
    for title in CHECKS:
        p = panels().get(title) or {}
        words = re.findall(r"[A-Za-z]+", p.get("description", ""))
        ensure(len(words) >= 6, f"Expected a description of at least 6 words on the {title} panel but found {len(words)}")
    return "All three panels have descriptions"


c.run()
