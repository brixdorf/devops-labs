```bash
kubectl get pods                                  # ErrImagePull, then ImagePullBackOff
kubectl describe pod -l app=catalog | tail -20     # Failed to pull image ... not found
kubectl get deployment catalog -o jsonpath='{.spec.template.spec.containers[0].image}'

cat > /home/user/diagnosis.txt <<END
pod_status=ImagePullBackOff
broken_image=$(kubectl get deployment catalog -o jsonpath='{.spec.template.spec.containers[0].image}')
END

kubectl set image deployment/catalog catalog={{IMAGE_NGINX}}
kubectl rollout status deployment/catalog
kubectl get events --sort-by=.lastTimestamp > /home/user/events.txt
```
