## Objective

Three signals tell you most of what you need to know about a web service: how many requests it handles (**rate**), how many of them fail (**errors**) and how long they take (**latency**). You will build a Grafana dashboard with one panel for each, using the metrics Prometheus already collects from the `orders-api` service, and describe what each panel tells an engineer.

- Grafana: {{GRAFANA_URL}} (or **Open Grafana**), user `{{GRAFANA_USER}}`, password `{{GRAFANA_PASSWORD}}`
- Prometheus is already configured as Grafana's default data source and scrapes `orders-api` every 5 seconds.
- `orders-api` exposes `http_requests_total` (a counter with a `status` label) and `http_request_duration_seconds` (a histogram).

## Tasks

### Task 1: Create the dashboard

Create a dashboard titled `Orders API`.

### Task 2: Add the three panels

Add three time series panels that use the Prometheus data source, with exactly these titles and queries of this kind:

| Panel title | What the query must compute |
| --- | --- |
| `Request rate` | requests per second over all paths and statuses: `sum(rate(http_requests_total[1m]))` |
| `Error rate` | requests per second that returned a 5xx status: `sum(rate(http_requests_total{status=~"5.."}[1m]))` |
| `Latency p95` | the 95th percentile request duration: `histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))` |

You may change the time window (for example `[2m]`) or show errors as a ratio of all requests, as long as each query computes what the table says.

### Task 3: Explain each panel

Give every panel a **description** (in the panel options) of at least six words that says what the panel indicates and when an engineer should worry, for example "Share of requests failing with server errors; a rise means users see failures".

### Task 4: Save

Save the dashboard.

## Notes

- In a new panel, switch the query editor to **Code** mode to type PromQL directly.
- The panels need a minute of data before lines appear.

## Expected outcome

A saved `Orders API` dashboard with Request rate, Error rate and Latency p95 panels whose queries return data from `orders-api`, each with a description.
