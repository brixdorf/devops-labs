```bash
curl -s http://localhost:8000/metrics | grep '# TYPE'
cat >> /etc/prometheus/prometheus.yml <<'END'

  - job_name: orders-api
    scrape_interval: 5s
    static_configs:
      - targets: ["lab:8000"]
END
cat /etc/prometheus/prometheus.yml
curl -X POST {{PROMETHEUS_URL}}/-/reload
curl -s {{PROMETHEUS_URL}}/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health}'

cat > /home/user/metrics.txt <<'END'
target_health=up
counter_metric=http_requests_total
gauge_metric=orders_in_queue
END
```
