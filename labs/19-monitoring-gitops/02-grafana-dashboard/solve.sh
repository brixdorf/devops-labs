#!/bin/bash
set -euo pipefail
cat > /tmp/dashboard.json <<'END'
{
  "overwrite": true,
  "dashboard": {
    "title": "Orders API",
    "panels": [
      {"type": "timeseries", "title": "Request rate", "gridPos": {"x": 0, "y": 0, "w": 8, "h": 8},
       "description": "Requests per second handled by orders-api; sudden drops or spikes need a look.",
       "datasource": {"type": "prometheus", "uid": "prometheus"},
       "targets": [{"refId": "A", "expr": "sum(rate(http_requests_total[1m]))"}]},
      {"type": "timeseries", "title": "Error rate", "gridPos": {"x": 8, "y": 0, "w": 8, "h": 8},
       "description": "Requests per second failing with 5xx errors; any rise means users see failures.",
       "datasource": {"type": "prometheus", "uid": "prometheus"},
       "targets": [{"refId": "A", "expr": "sum(rate(http_requests_total{status=~\"5..\"}[1m]))"}]},
      {"type": "timeseries", "title": "Latency p95", "gridPos": {"x": 16, "y": 0, "w": 8, "h": 8},
       "description": "Time within which 95 percent of requests finish; higher means a slower service.",
       "datasource": {"type": "prometheus", "uid": "prometheus"},
       "targets": [{"refId": "A", "expr": "histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))"}]}
    ]
  }
}
END
curl -sf -u "$GRAFANA_USER:$GRAFANA_PASSWORD" -H 'Content-Type: application/json' -X POST "$GRAFANA_URL/api/dashboards/db" -d @/tmp/dashboard.json >/dev/null
rm -f /tmp/dashboard.json
sleep 20
