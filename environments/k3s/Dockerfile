# Kubernetes cluster node: k3s with image pulls going through the local
# registry caches, plus the pinned Argo CD manifest for GitOps labs.
ARG PARENT_IMAGE
ARG K3S_IMAGE
FROM ${PARENT_IMAGE} AS fetch
ARG ARGOCD_VERSION
ARG REDIS_IMAGE
RUN mkdir -p /out \
 && curl -fsSL "https://raw.githubusercontent.com/argoproj/argo-cd/${ARGOCD_VERSION}/manifests/install.yaml" -o /out/install.yaml \
 && grep -q "quay.io/argoproj/argocd:${ARGOCD_VERSION}" /out/install.yaml \
 && sed -i -E "s#image: [^ ]*/redis:[^ ]+#image: docker.io/library/${REDIS_IMAGE}#" /out/install.yaml

FROM ${K3S_IMAGE}
COPY files/registries.yaml /etc/rancher/k3s/registries.yaml
COPY files/argocd-install.sh /opt/devops-labs/argocd/install.sh
COPY --from=fetch /out/install.yaml /opt/devops-labs/argocd/install.yaml
