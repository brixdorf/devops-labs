```bash
cd /home/user/charts
helm status catalog -n catalog
helm get values catalog -n catalog
helm history catalog -n catalog

helm upgrade catalog ./catalog -n catalog --reuse-values \
  --set image.tag=<tag of {{IMAGE_PODINFO}}> --set replicaCount=2 --wait
helm history catalog -n catalog > history-after-upgrade.txt

helm rollback catalog 1 -n catalog --wait
helm history catalog -n catalog > history-after-rollback.txt
helm status catalog -n catalog > final-status.txt
kubectl get deploy catalog -n catalog -o wide
```
