#!/bin/bash
set -euo pipefail
cat <<END | kubectl apply -f -
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: web
  namespace: argocd
spec:
  project: default
  source:
    repoURL: http://gitea:3000/$GITEA_USER/gitops-demo.git
    targetRevision: main
    path: apps/web
  destination:
    server: https://kubernetes.default.svc
    namespace: web
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
END
status() { kubectl -n argocd get application web -o jsonpath='{.status.sync.status}/{.status.health.status}/{.status.sync.revision}' 2>/dev/null; }
for _ in $(seq 1 90); do [[ "$(status)" == Synced/Healthy/* ]] && break; sleep 3; done
cd /home/user/gitops-demo
sed -i 's/replicas: 2/replicas: 4/' apps/web/deployment.yaml
git commit -qam "Scale web to 4 replicas"
git push -q
head=$(git rev-parse HEAD)
for _ in $(seq 1 90); do
  [ "$(status)" = "Synced/Healthy/$head" ] && [ "$(kubectl -n web get deploy web -o jsonpath='{.status.readyReplicas}')" = 4 ] && break
  sleep 3
done
kubectl -n argocd get application web -o jsonpath='{.status.sync.revision}' > /home/user/gitops-demo-revision.txt
