# Gitea Actions runner. Jobs run directly in this container ("host" mode),
# which has its own Docker engine, Node.js, Python and security scanners.
ARG PARENT_IMAGE
ARG ACT_RUNNER_IMAGE
FROM ${ACT_RUNNER_IMAGE} AS act

FROM ${PARENT_IMAGE}
ARG TARGETARCH
ARG NODE_VERSION
ARG TRIVY_VERSION
ARG GITLEAKS_VERSION
ARG BANDIT_VERSION
ARG PIP_WHEELS
COPY --from=act /usr/local/bin/act_runner /usr/local/bin/act_runner
RUN set -e; cd /tmp; \
    case "$TARGETARCH" in arm64) NODE_ARCH=arm64; TRIVY_ARCH=ARM64; GL_ARCH=arm64 ;; *) NODE_ARCH=x64; TRIVY_ARCH=64bit; GL_ARCH=x64 ;; esac; \
    curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz"; \
    curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt"; \
    grep " node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz\$" SHASUMS256.txt | sha256sum -c -; \
    tar -xJf "node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" -C /usr/local --strip-components=1 --exclude='*.md' --exclude=LICENSE; \
    curl -fsSLO "https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}/trivy_${TRIVY_VERSION}_Linux-${TRIVY_ARCH}.tar.gz"; \
    curl -fsSLO "https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}/trivy_${TRIVY_VERSION}_checksums.txt"; \
    grep " trivy_${TRIVY_VERSION}_Linux-${TRIVY_ARCH}.tar.gz\$" "trivy_${TRIVY_VERSION}_checksums.txt" | sha256sum -c -; \
    tar -xzf "trivy_${TRIVY_VERSION}_Linux-${TRIVY_ARCH}.tar.gz" -C /usr/local/bin trivy; \
    curl -fsSLO "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_${GL_ARCH}.tar.gz"; \
    curl -fsSLO "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_checksums.txt"; \
    grep " gitleaks_${GITLEAKS_VERSION}_linux_${GL_ARCH}.tar.gz\$" "gitleaks_${GITLEAKS_VERSION}_checksums.txt" | sha256sum -c -; \
    tar -xzf "gitleaks_${GITLEAKS_VERSION}_linux_${GL_ARCH}.tar.gz" -C /usr/local/bin gitleaks; \
    rm -rf /tmp/*; \
    python3 -m venv /opt/bandit; \
    /opt/bandit/bin/pip install -q --no-cache-dir "bandit==${BANDIT_VERSION}"; \
    ln -s /opt/bandit/bin/bandit /usr/local/bin/bandit; \
    python3 -m venv /opt/wheel-tool; \
    /opt/wheel-tool/bin/pip download -q --no-cache-dir -d /opt/wheels $PIP_WHEELS; \
    rm -rf /opt/wheel-tool; \
    trivy image --download-db-only --cache-dir /opt/trivy-cache --no-progress; \
    chmod -R a+rX /opt/trivy-cache
COPY files/config.yaml /etc/act_runner/config.yaml
COPY files/50-runner.sh /etc/devops-labs/start.d/50-runner.sh
COPY files/pip.conf /etc/pip.conf
ENV TRIVY_CACHE_DIR=/opt/trivy-cache \
    TRIVY_SKIP_DB_UPDATE=true \
    TRIVY_SKIP_JAVA_DB_UPDATE=true \
    TRIVY_NO_PROGRESS=true
