#!/bin/sh
# Installs Argo CD into the lab cluster with fixed practice credentials and
# the web interface on node port 30804 (plain HTTP, local only).
set -e
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -n argocd --server-side --force-conflicts -f /opt/devops-labs/argocd/install.yaml >/dev/null
kubectl -n argocd scale deployment argocd-dex-server argocd-notifications-controller --replicas=0
kubectl -n argocd patch configmap argocd-cmd-params-cm --type merge -p '{"data":{"server.insecure":"true"}}'
# Password: argocd@123!
kubectl -n argocd patch secret argocd-secret --type merge -p '{"stringData":{"admin.password":"$2a$10$aMdi48ywk3EYXSD7T2M.6efKhcpdy9FbbRls.rfgqsrhEvBcMdJ/K","admin.passwordMtime":"2026-01-01T00:00:00Z"}}'
kubectl -n argocd delete secret argocd-initial-admin-secret --ignore-not-found
kubectl -n argocd patch service argocd-server -p '{"spec":{"type":"NodePort","ports":[{"name":"http","port":80,"protocol":"TCP","targetPort":8080,"nodePort":30804},{"name":"https","port":443,"protocol":"TCP","targetPort":8080,"nodePort":30805}]}}'
# Pods resolve names through CoreDNS, which does not know the lab network,
# so add the Gitea address there for repository access.
GITEA_IP=$(nslookup gitea 127.0.0.11 2>/dev/null | awk '/^Address: /{print $2}' | tail -n1)
if [ -n "$GITEA_IP" ]; then
  kubectl -n kube-system get configmap coredns -o jsonpath='{.data.NodeHosts}' > /tmp/nodehosts
  grep -q " gitea$" /tmp/nodehosts || printf '%s gitea\n' "$GITEA_IP" >> /tmp/nodehosts
  kubectl -n kube-system create configmap coredns --from-file=NodeHosts=/tmp/nodehosts --dry-run=client -o yaml \
    | kubectl -n kube-system patch configmap coredns --type merge --patch-file /dev/stdin
fi
kubectl -n argocd rollout restart deployment argocd-server
for target in deployment/argocd-server deployment/argocd-repo-server deployment/argocd-redis statefulset/argocd-application-controller; do
  kubectl -n argocd rollout status "$target" --timeout=600s
done
