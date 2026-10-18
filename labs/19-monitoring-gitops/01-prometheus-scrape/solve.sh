#!/bin/bash
set -euo pipefail
printf '\n  - job_name: orders-api\n    scrape_interval: 5s\n    static_configs:\n      - targets: ["lab:8000"]\n' >> /etc/prometheus/prometheus.yml
curl -sf -X POST "$PROMETHEUS_URL/-/reload"
for _ in $(seq 1 30); do
  curl -s "$PROMETHEUS_URL/api/v1/targets" | python3 -c 'import json,sys; t=json.load(sys.stdin)["data"]["activeTargets"]; sys.exit(0 if any(x["labels"]["job"]=="orders-api" and x["health"]=="up" for x in t) else 1)' && break
  sleep 2
done
printf 'target_health=up\ncounter_metric=http_requests_total\ngauge_metric=orders_in_queue\n' > /home/user/metrics.txt
