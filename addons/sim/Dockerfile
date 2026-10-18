# Simulated services for networking labs (web servers, DNS and so on).
ARG PARENT_IMAGE
FROM ${PARENT_IMAGE}
RUN apt-get update \
 && apt-get install -y --no-install-recommends dnsmasq openssl \
 && rm -rf /var/lib/apt/lists/*
CMD ["sleep", "infinity"]
