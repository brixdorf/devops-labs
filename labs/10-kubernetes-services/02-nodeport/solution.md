```bash
kubectl create deployment storefront --image={{IMAGE_NGINX}} --replicas=2 --port=80
kubectl rollout status deployment/storefront
cat <<'END' | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: storefront-np
spec:
  type: NodePort
  selector:
    app: storefront
  ports:
    - port: 80
      targetPort: 80
      nodePort: 30080
END
curl -s http://k3s:30080/ > /home/user/nodeport-response.html
ip=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
printf 'node_ip=%s\nnode_port=30080\nurl=http://%s:30080/\n' "$ip" "$ip" > /home/user/nodeport.txt
curl -s "http://$ip:30080/" | head -5
```
