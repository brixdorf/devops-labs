# Terraform environment with a pre-filled provider cache so terraform init
# works quickly and offline.
ARG PARENT_IMAGE
FROM ${PARENT_IMAGE}
ARG TARGETARCH
ARG TERRAFORM_VERSION
ARG TF_AWS_VERSION
ARG TF_LOCAL_VERSION
ARG TF_RANDOM_VERSION
ARG TF_NULL_VERSION
RUN cd /tmp \
 && curl -fsSLO "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_${TARGETARCH}.zip" \
 && curl -fsSLO "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_SHA256SUMS" \
 && grep "linux_${TARGETARCH}.zip" "terraform_${TERRAFORM_VERSION}_SHA256SUMS" | sha256sum -c - \
 && unzip -q "terraform_${TERRAFORM_VERSION}_linux_${TARGETARCH}.zip" terraform \
 && install -m 0755 terraform /usr/local/bin/terraform \
 && rm -rf /tmp/* \
 && terraform -install-autocomplete 2>/dev/null; true
COPY files/terraformrc /etc/terraformrc
ENV TF_CLI_CONFIG_FILE=/etc/terraformrc
RUN mkdir -p /tmp/warm /usr/share/terraform/providers \
 && printf 'terraform {\n  required_providers {\n    aws = { source = "hashicorp/aws", version = "%s" }\n    local = { source = "hashicorp/local", version = "%s" }\n    random = { source = "hashicorp/random", version = "%s" }\n    null = { source = "hashicorp/null", version = "%s" }\n  }\n}\n' \
      "$TF_AWS_VERSION" "$TF_LOCAL_VERSION" "$TF_RANDOM_VERSION" "$TF_NULL_VERSION" > /tmp/warm/main.tf \
 && cd /tmp/warm \
 && TF_CLI_CONFIG_FILE=/dev/null terraform providers mirror -platform="linux_${TARGETARCH}" /tmp/mirror \
 && for zip in $(find /tmp/mirror -name '*.zip'); do \
      rel=$(dirname "${zip#/tmp/mirror/}"); \
      ver=$(basename "$zip" | sed -E 's/^terraform-provider-[a-z]+_([0-9.]+)_linux_.*/\1/'); \
      dest="/usr/share/terraform/providers/${rel}/${ver}/linux_${TARGETARCH}"; \
      mkdir -p "$dest" && unzip -q "$zip" -d "$dest"; \
    done \
 && rm -rf /tmp/warm /tmp/mirror \
 && echo 'export TF_CLI_CONFIG_FILE=/etc/terraformrc' > /etc/profile.d/terraform.sh
