1. Apply a PVC manifest, then check `kubectl get pvc` (it stays Pending until a Pod uses it).
2. Write `pod.yaml`, apply it, and wait with `kubectl wait --for=condition=Ready pod/notes-writer`.
3. Write the file with `kubectl exec`.
4. `kubectl delete pod notes-writer`, then `kubectl apply -f /home/user/storage/pod.yaml` again and wait.
5. `kubectl exec notes-writer -- cat /data/notes.txt > /home/user/storage/after-recreate.txt`
