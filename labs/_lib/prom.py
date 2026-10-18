"""Helpers for checkers of Prometheus and Grafana labs."""
import urllib.parse

from labcheck import http_json

PROM = "http://prometheus:9090"


def query(expr):
    status, data = http_json(f"{PROM}/api/v1/query?query={urllib.parse.quote(expr)}")
    if status != 200 or not data or data.get("status") != "success":
        return None
    return data["data"]["result"]


def targets(job):
    status, data = http_json(f"{PROM}/api/v1/targets?state=active")
    if status != 200 or not data:
        return []
    return [t for t in data["data"]["activeTargets"] if t.get("labels", {}).get("job") == job]


def metric_types(job):
    status, data = http_json(f"{PROM}/api/v1/metadata")
    if status != 200 or not data:
        return {}
    return {name: entries[0].get("type") for name, entries in data["data"].items() if entries}
