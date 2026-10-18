import yaml

from labcheck import Checker, ensure, lines, quote, read, wait_until
from prom import metric_types, query, targets

c = Checker()
CONFIG = "/etc/prometheus/prometheus.yml"


@c.test("prometheus.yml has the orders-api job")
def _():
    try:
        cfg = yaml.safe_load(read(CONFIG)) or {}
    except yaml.YAMLError as exc:
        ensure(False, f"Expected valid YAML in {CONFIG}: {str(exc).splitlines()[0]}")
    jobs = {j.get("job_name"): j for j in cfg.get("scrape_configs") or []}
    ensure("prometheus" in jobs, "Expected the original prometheus job to stay")
    job = jobs.get("orders-api")
    ensure(job, "Expected a scrape job named orders-api")
    ensure(job.get("scrape_interval") == "5s", f"Expected scrape_interval: 5s but found {job.get('scrape_interval')!r}")
    tgts = [t for sc in job.get("static_configs") or [] for t in sc.get("targets") or []]
    ensure("lab:8000" in tgts, f"Expected the target lab:8000 but found {tgts}")
    return "orders-api scrapes lab:8000 every 5s"


@c.test("Prometheus loaded the job and the target is up", requires=["prometheus.yml has the orders-api job"])
def _():
    found = wait_until(lambda: [t for t in targets("orders-api") if t.get("health") == "up"], timeout=30)
    if not found:
        t = targets("orders-api")
        ensure(t, "Expected Prometheus to know the orders-api job. Reload its configuration.")
        ensure(False, f"Expected the target to be up but it is {t[0].get('health')}: {t[0].get('lastError', '')}")
    ensure(found[0]["scrapeUrl"] == "http://lab:8000/metrics", f"Expected the scrape URL http://lab:8000/metrics but found {found[0]['scrapeUrl']}")
    return "The orders-api target is up"


@c.test("orders-api data arrives in Prometheus", requires=["Prometheus loaded the job and the target is up"])
def _():
    result = wait_until(lambda: query('http_requests_total{job="orders-api"}'), timeout=30)
    ensure(result, "Expected http_requests_total series from the orders-api job")
    return f"{len(result)} request series are stored"


@c.test("metrics.txt names a real counter and gauge", requires=["orders-api data arrives in Prometheus"])
def _():
    got = {}
    for line in lines("/home/user/metrics.txt", "the file /home/user/metrics.txt"):
        if "=" in line:
            k, v = line.split("=", 1)
            got[k.strip()] = v.strip()
    ensure(got.get("target_health", "").lower() == "up", f"Expected target_health=up but found {quote(got.get('target_health', ''))}")
    types = metric_types("orders-api")
    for key, kind in [("counter_metric", "counter"), ("gauge_metric", "gauge")]:
        name = got.get(key, "")
        ensure(name, f"Expected a line '{key}=...' in metrics.txt")
        ensure(query(f'{name}{{job="orders-api"}}'), f"Expected {name} to be a metric from orders-api in Prometheus")
        ensure(types.get(name) == kind, f"Expected {name} to be a {kind} but Prometheus says it is a {types.get(name, 'unknown')}")
    return f"{got['counter_metric']} (counter) and {got['gauge_metric']} (gauge)"


c.run()
