# Gitea, the local GitHub stand-in, with Gitea Actions enabled. Copies of the
# official actions are baked in and served by Gitea itself, so workflows that
# use actions/checkout and friends do not need github.com.
ARG GITEA_IMAGE
FROM ${GITEA_IMAGE}
ARG CHECKOUT_VERSION
ARG UPLOAD_ARTIFACT_VERSION
ARG DOWNLOAD_ARTIFACT_VERSION
RUN set -e; mkdir -p /opt/devops-labs/actions; cd /opt/devops-labs/actions; \
    for spec in "checkout ${CHECKOUT_VERSION}" "upload-artifact ${UPLOAD_ARTIFACT_VERSION}" "download-artifact ${DOWNLOAD_ARTIFACT_VERSION}"; do \
      set -- $spec; \
      git clone -q --bare --depth 1 --branch "$2" "https://github.com/actions/$1.git" "$1.git"; \
      major="${2%%.*}"; \
      git -C "$1.git" tag "$major" "$2^{commit}"; \
      git -C "$1.git" branch -f main "$2^{commit}"; \
    done
COPY devops-labs-gitea-init /usr/local/bin/devops-labs-gitea-init
RUN chmod 0755 /usr/local/bin/devops-labs-gitea-init
ENV GITEA__security__INSTALL_LOCK=true \
    GITEA__security__PASSWORD_COMPLEXITY=off \
    GITEA__database__DB_TYPE=sqlite3 \
    GITEA__server__OFFLINE_MODE=true \
    GITEA__server__HTTP_PORT=3000 \
    GITEA__server__DISABLE_SSH=true \
    GITEA__service__DISABLE_REGISTRATION=true \
    GITEA__service__REQUIRE_SIGNIN_VIEW=false \
    GITEA__repository__DEFAULT_BRANCH=main \
    GITEA__repository__ENABLE_PUSH_CREATE_USER=true \
    GITEA__actions__ENABLED=true \
    GITEA__actions__DEFAULT_ACTIONS_URL=self \
    GITEA__log__LEVEL=Warn \
    GITEA__mailer__ENABLED=false \
    GITEA__other__SHOW_FOOTER_VERSION=false \
    GITEA__cron__ENABLED=false \
    GITEA__migrations__ALLOW_LOCALNETWORKS=true \
    GITEA__webhook__ALLOWED_HOST_LIST=*
