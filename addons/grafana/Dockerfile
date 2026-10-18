# Grafana with the lab Prometheus already configured as a data source.
ARG GRAFANA_IMAGE
FROM ${GRAFANA_IMAGE}
COPY provisioning/datasources/prometheus.yml /etc/grafana/provisioning/datasources/prometheus.yml
ENV GF_ANALYTICS_REPORTING_ENABLED=false GF_ANALYTICS_CHECK_FOR_UPDATES=false GF_ANALYTICS_CHECK_FOR_PLUGIN_UPDATES=false \
    GF_NEWS_NEWS_FEED_ENABLED=false GF_USERS_DEFAULT_THEME=light
