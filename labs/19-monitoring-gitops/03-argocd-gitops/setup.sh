#!/bin/bash
set -euo pipefail
. "$LAB_DIR/lib/gitea.sh"
cat > "$LAB_DIR/files/repo/apps/web/deployment.yaml" <<END
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: $IMAGE_PODINFO
          ports:
            - containerPort: 9898
END
gitea_user_git_setup
gitea_seed_repo gitops-demo "$LAB_DIR/files/repo"
rm -f /home/user/gitops-demo-revision.txt
