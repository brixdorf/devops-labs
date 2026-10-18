```bash
cat <<'END' | kubectl apply -f -
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: web
  namespace: argocd
spec:
  project: default
  source:
    repoURL: http://gitea:3000/{{GITEA_USER}}/gitops-demo.git
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
kubectl -n argocd get application web -w        # wait for Synced / Healthy, then Ctrl+C
kubectl -n web get deploy web                   # 2/2

cd /home/user/gitops-demo
sed -i 's/replicas: 2/replicas: 4/' apps/web/deployment.yaml
git commit -am "Scale web to 4 replicas"
git push
kubectl -n web get deploy web -w                # becomes 4/4 within a minute
kubectl -n argocd get application web -o jsonpath='{.status.sync.revision}' > /home/user/gitops-demo-revision.txt
```
