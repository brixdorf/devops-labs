```bash
mkdir -p /home/user/rollout
kubectl create deployment catalog --image={{IMAGE_PODINFO_PREVIOUS}} --replicas=3
kubectl rollout status deployment/catalog

kubectl set image deployment/catalog podinfo={{IMAGE_PODINFO}}
kubectl rollout status deployment/catalog
kubectl get pods -l app=catalog -o jsonpath='{range .items[*]}{.spec.containers[0].image}{"\n"}{end}'
kubectl rollout history deployment/catalog > /home/user/rollout/history-after-update.txt

kubectl rollout undo deployment/catalog
kubectl rollout status deployment/catalog
kubectl rollout history deployment/catalog > /home/user/rollout/history-after-rollback.txt

cat > /home/user/rollout/result.txt <<'END'
current_image={{IMAGE_PODINFO_PREVIOUS}}
revisions=2
END
```

After the rollback the history lists two revisions (2 and 3): revision 1 was renumbered to 3 because it is current again.
