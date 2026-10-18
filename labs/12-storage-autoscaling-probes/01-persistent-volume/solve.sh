#!/bin/bash
set -euo pipefail
mkdir -p /home/user/storage && cd /home/user/storage
cat <<'END' | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: notes-pvc
spec:
  accessModes: ["ReadWriteOnce"]
  storageClassName: local-path
  resources:
    requests:
      storage: 1Gi
END
cat > pod.yaml <<END
apiVersion: v1
kind: Pod
metadata:
  name: notes-writer
spec:
  containers:
    - name: writer
      image: $IMAGE_BUSYBOX
      command: ["sleep", "3600"]
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: notes-pvc
END
kubectl apply -f pod.yaml
kubectl wait --for=condition=Ready pod/notes-writer --timeout=300s
kubectl exec notes-writer -- sh -c 'echo "Persistent storage works" > /data/notes.txt'
sleep 2
kubectl delete pod notes-writer --wait=true
kubectl apply -f pod.yaml
kubectl wait --for=condition=Ready pod/notes-writer --timeout=300s
kubectl exec notes-writer -- cat /data/notes.txt > after-recreate.txt
