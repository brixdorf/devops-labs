#!/bin/bash
set -euo pipefail
cd /home/user/charts
cat > prod-values.yaml <<END
replicaCount: 3
image:
  repository: ${IMAGE_NGINX%:*}
  tag: "${IMAGE_NGINX##*:}"
service:
  port: 8080
END
helm template shop ./shop -f prod-values.yaml > rendered.yaml
helm install shop ./shop -f prod-values.yaml -n shop --create-namespace --wait --timeout 5m >/dev/null
helm get values shop -n shop > installed-values.txt
