# Prometheus with a configuration the lab user can edit and reload.
ARG PROMETHEUS_IMAGE
FROM ${PROMETHEUS_IMAGE}
USER root
COPY prometheus.yml /etc/prometheus/prometheus.yml
RUN chmod 0777 /etc/prometheus && chmod 0666 /etc/prometheus/prometheus.yml
USER nobody
CMD ["--config.file=/etc/prometheus/prometheus.yml", "--storage.tsdb.path=/prometheus", "--web.enable-lifecycle", "--web.enable-admin-api"]
