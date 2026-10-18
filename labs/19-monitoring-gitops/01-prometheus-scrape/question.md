## Objective

Monitoring starts with metrics: numbers an application exposes about itself, such as how many requests it served and how long they took. **Prometheus** collects them by regularly **scraping** an HTTP endpoint. In this lab you connect Prometheus to a running service and confirm that the data arrives.

The service `orders-api` already runs on this machine. It exposes its metrics at `http://localhost:8000/metrics`. Other machines on the lab network reach this machine as `lab`, so Prometheus sees the service at `lab:8000`.

Prometheus runs at {{PROMETHEUS_URL}} (open it with the **Open Prometheus** button). Its configuration file is mounted on this machine at `/etc/prometheus/prometheus.yml`, and you can edit it directly.

## Tasks

### Task 1: Look at the metrics

Run `curl -s http://localhost:8000/metrics` and look at the metric names, their types (`# TYPE` lines) and labels.

### Task 2: Add a scrape job

Add a job to `/etc/prometheus/prometheus.yml` under `scrape_configs`:

- `job_name: orders-api`
- `scrape_interval: 5s`
- target `lab:8000` (the default path `/metrics` is right)

Keep the existing `prometheus` job.

### Task 3: Reload Prometheus

Tell Prometheus to reload its configuration:

```
curl -X POST {{PROMETHEUS_URL}}/-/reload
```

### Task 4: Verify the target

In the Prometheus web interface, open **Status**, then **Target health**, and wait until the `orders-api` target is **UP**. Then run a query such as `http_requests_total` in the **Query** page.

### Task 5: Record two metrics

Create `/home/user/metrics.txt` with:

```
target_health=<the health shown for the orders-api target>
counter_metric=<the name of a counter that orders-api exposes>
gauge_metric=<the name of a gauge that orders-api exposes>
```

## Notes

- YAML is sensitive to indentation: the new job is a list item at the same level as the existing `- job_name: prometheus`.
- If the reload fails, Prometheus keeps the old configuration and says why: `curl -X POST ...` prints the error.

## Expected outcome

Prometheus scrapes `orders-api` successfully every 5 seconds, and `metrics.txt` names a counter and a gauge that really arrive in Prometheus.
