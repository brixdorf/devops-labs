# Test runner and maintainer tools: Playwright with browsers, Node.js, Git
# and the Docker CLI with the Compose plugin.
ARG PLAYWRIGHT_IMAGE=mcr.microsoft.com/playwright:v1.64.1-noble
FROM ${PLAYWRIGHT_IMAGE}
ARG DOCKER_CE_VERSION=29.9.1
ARG COMPOSE_VERSION=5.6.0
ARG BUILDX_VERSION=0.38.0
ARG DOCKER_KEY_FINGERPRINT=9DC858229FC7DD38854AE2D88D81803C0EBFCD88
LABEL org.devopslabs.project=devops-labs
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl git gnupg \
 && install -m 0755 -d /etc/apt/keyrings \
 && curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc \
 && gpg --show-keys --with-colons /etc/apt/keyrings/docker.asc | grep -q "fpr:::::::::${DOCKER_KEY_FINGERPRINT}:" \
 && . /etc/os-release \
 && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends "docker-ce-cli=5:${DOCKER_CE_VERSION}-*" "docker-compose-plugin=${COMPOSE_VERSION}-*" "docker-buildx-plugin=${BUILDX_VERSION}-*" \
 && rm -rf /var/lib/apt/lists/* \
 && git config --system --add safe.directory '*'
WORKDIR /opt/devops-labs/deps
COPY app/package.json app/package-lock.json /opt/devops-labs/deps/app/
COPY tests/package.json tests/package-lock.json /opt/devops-labs/deps/tests/
RUN cd /opt/devops-labs/deps/app && npm ci --no-audit --no-fund \
 && cd /opt/devops-labs/deps/tests && npm ci --no-audit --no-fund
WORKDIR /repo
CMD ["node", "tests/run-all.mjs"]
