# Kubernetes tools for the lab container. The cluster itself runs in a
# separate k3s container on the lab network.
ARG PARENT_IMAGE
FROM ${PARENT_IMAGE}
ARG TARGETARCH
ARG KUBECTL_VERSION
ARG HELM_VERSION
RUN cd /tmp \
 && curl -fsSLO "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/${TARGETARCH}/kubectl" \
 && curl -fsSLO "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/${TARGETARCH}/kubectl.sha256" \
 && echo "$(cat kubectl.sha256)  kubectl" | sha256sum -c - \
 && install -m 0755 kubectl /usr/local/bin/kubectl \
 && curl -fsSLO "https://get.helm.sh/helm-${HELM_VERSION}-linux-${TARGETARCH}.tar.gz" \
 && curl -fsSLO "https://get.helm.sh/helm-${HELM_VERSION}-linux-${TARGETARCH}.tar.gz.sha256sum" \
 && sha256sum -c "helm-${HELM_VERSION}-linux-${TARGETARCH}.tar.gz.sha256sum" \
 && tar -xzf "helm-${HELM_VERSION}-linux-${TARGETARCH}.tar.gz" \
 && install -m 0755 "linux-${TARGETARCH}/helm" /usr/local/bin/helm \
 && rm -rf /tmp/* \
 && kubectl completion bash > /etc/bash_completion.d/kubectl \
 && helm completion bash > /etc/bash_completion.d/helm \
 && install -d -o user -g user /home/user/.kube \
 && echo 'alias k=kubectl' >> /home/user/.bashrc \
 && echo 'complete -o default -F __start_kubectl k' >> /home/user/.bashrc
