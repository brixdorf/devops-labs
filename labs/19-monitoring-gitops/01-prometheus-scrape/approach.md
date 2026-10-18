1. `curl -s localhost:8000/metrics | grep TYPE` lists every metric with its type.
2. Edit `/etc/prometheus/prometheus.yml` with `nano` and add the job under `scrape_configs`.
3. Reload with the `curl -X POST .../-/reload` command.
4. Check the target page until the state is UP (or `curl -s {{PROMETHEUS_URL}}/api/v1/targets`).
5. Write `metrics.txt`.
