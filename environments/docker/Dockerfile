# Docker environment: a private Docker engine (Docker in Docker) with the
# Compose and Buildx plugins.
ARG PARENT_IMAGE
FROM ${PARENT_IMAGE}
ARG DOCKER_CE_VERSION
ARG CONTAINERD_VERSION
ARG COMPOSE_VERSION
ARG BUILDX_VERSION
# Docker's apt signing key, checked against its published fingerprint.
ARG DOCKER_KEY_FINGERPRINT=9DC858229FC7DD38854AE2D88D81803C0EBFCD88
RUN install -m 0755 -d /etc/apt/keyrings \
 && curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc \
 && gpg --show-keys --with-colons /etc/apt/keyrings/docker.asc | grep -q "fpr:::::::::${DOCKER_KEY_FINGERPRINT}:" \
 && . /etc/os-release \
 && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends iptables \
      "docker-ce=5:${DOCKER_CE_VERSION}-*" "docker-ce-cli=5:${DOCKER_CE_VERSION}-*" "containerd.io=${CONTAINERD_VERSION}-*" \
      "docker-compose-plugin=${COMPOSE_VERSION}-*" "docker-buildx-plugin=${BUILDX_VERSION}-*" \
 && rm -rf /var/lib/apt/lists/* \
 && usermod -aG docker user
COPY files/daemon.json /etc/docker/daemon.json
COPY files/10-dockerd.sh /etc/devops-labs/start.d/10-dockerd.sh
