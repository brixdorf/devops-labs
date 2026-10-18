```bash
kubectl get nodes -o wide
kubectl get namespaces
kubectl get pods -n kube-system
kubectl get storageclass
kubectl cluster-info
```

Fill the files from the output (values below are an example of their shape):

```bash
cat > /home/user/cluster-facts.txt <<END
node_name=k3s
kubernetes_version=$(kubectl get node k3s -o jsonpath='{.status.nodeInfo.kubeletVersion}')
node_ip=$(kubectl get node k3s -o jsonpath='{.status.addresses[?(@.type=="InternalIP")].address}')
namespaces=$(kubectl get ns -o name | cut -d/ -f2 | sort | paste -sd, -)
kube_system_pods=$(kubectl get pods -n kube-system --no-headers | wc -l)
default_storage_class=local-path
api_server=https://k3s:6443
END

cat > /home/user/cluster-commands.txt <<'END'
nodes_command=kubectl get nodes -o wide
namespaces_command=kubectl get namespaces
pods_command=kubectl get pods -n kube-system
cluster_info_command=kubectl cluster-info
END
```
