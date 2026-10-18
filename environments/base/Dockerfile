# Base lab environment: Ubuntu LTS with common command line tools.
ARG UBUNTU_IMAGE
FROM ${UBUNTU_IMAGE}
ARG TARGETARCH
ENV DEBIAN_FRONTEND=noninteractive LANG=C.UTF-8

# Keep documentation so man pages work, then install the toolset. GNU
# coreutils are used instead of the default Rust ones for familiar behaviour.
RUN rm -f /etc/dpkg/dpkg.cfg.d/excludes \
 && if dpkg-divert --list /usr/bin/man | grep -q man; then rm -f /usr/bin/man && dpkg-divert --quiet --remove --rename /usr/bin/man; fi \
 && apt-get update \
 && apt-get install -y --no-install-recommends \
      bash-completion bind9-dnsutils ca-certificates coreutils curl file git gnupg iproute2 iputils-ping \
      jq less lsof man-db manpages nano net-tools netcat-openbsd procps psmisc python3 python3-venv \
      socat sudo tree tzdata unzip vim wget xz-utils zip \
 && apt-get install -y --no-install-recommends --allow-remove-essential coreutils-from-gnu coreutils-from-uutils- \
 && apt-get install -y --reinstall --no-install-recommends bash findutils gnu-coreutils grep gzip sed tar util-linux \
 && rm -rf /var/lib/apt/lists/* \
 && mandb -q || true

# The lab user, with sudo behind the fixed practice password.
RUN if id ubuntu >/dev/null 2>&1; then userdel -r ubuntu; fi \
 && useradd -m -u 1000 -s /bin/bash user \
 && echo 'user:user@123!' | chpasswd \
 && usermod -aG sudo user

COPY files/ /opt/devops-labs/base/
RUN cd /opt/devops-labs/base \
 && install -m 0755 lab-init /usr/local/sbin/lab-init \
 && install -m 0755 lab-forwards /usr/local/sbin/lab-forwards \
 && install -m 0440 sudoers /etc/sudoers.d/devops-labs \
 && install -d -m 0755 /etc/devops-labs/start.d /run/devops-labs \
 && install -m 0644 bashrc-extra /etc/devops-labs/bashrc-extra \
 && cat /etc/devops-labs/bashrc-extra >> /home/user/.bashrc \
 && cat /etc/devops-labs/bashrc-extra >> /root/.bashrc \
 && touch /home/user/.sudo_as_admin_successful /home/user/.hushlogin \
 && chown -R user:user /home/user \
 && chmod -x /etc/update-motd.d/* 2>/dev/null || true

WORKDIR /home/user
CMD ["/usr/local/sbin/lab-init"]
