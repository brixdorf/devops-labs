# Local container registry, also used as a pull-through cache for public registries.
ARG REGISTRY_IMAGE
FROM ${REGISTRY_IMAGE}
COPY registry.yml mirror.yml htpasswd /etc/distribution/
