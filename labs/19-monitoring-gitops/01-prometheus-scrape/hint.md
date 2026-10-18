- A scrape job looks like this:

```yaml
  - job_name: orders-api
    scrape_interval: 5s
    static_configs:
      - targets: ["lab:8000"]
```

- In the metrics output, `# TYPE http_requests_total counter` says which kind each metric is.
