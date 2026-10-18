#!/bin/bash
set -euo pipefail
. "$LAB_DIR/lib/orders-api.sh"
cat >> /etc/prometheus/prometheus.yml <<'END'

  - job_name: orders-api
    scrape_interval: 5s
    static_configs:
      - targets: ["lab:8000"]
END
for _ in $(seq 1 30); do curl -sf -X POST http://prometheus:9090/-/reload && break; sleep 1; done
