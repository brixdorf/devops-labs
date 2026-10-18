1. `mkdir -p /home/user/pod` and write the manifest with `nano`.
2. `kubectl apply -f /home/user/pod/nginx-pod.yaml` and `kubectl get pod nginx-pod -w` until Running (Ctrl+C to stop watching).
3. In a second terminal tab run `kubectl port-forward pod/nginx-pod 8080:80`, and in the first run `curl localhost:8080`.
4. `kubectl get pod nginx-pod -o wide --show-labels`, then write `pod-info.txt`.
5. `kubectl logs nginx-pod > /home/user/pod/nginx-pod.log`
