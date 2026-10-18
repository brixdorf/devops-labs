#!/bin/bash
set -euo pipefail
node=$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}')
cat > /home/user/cluster-facts.txt <<END
node_name=$node
kubernetes_version=$(kubectl get node "$node" -o jsonpath='{.status.nodeInfo.kubeletVersion}')
node_ip=$(kubectl get node "$node" -o jsonpath='{.status.addresses[?(@.type=="InternalIP")].address}')
namespaces=$(kubectl get ns -o name | cut -d/ -f2 | sort | paste -sd, -)
kube_system_pods=$(kubectl get pods -n kube-system --no-headers | wc -l)
default_storage_class=$(kubectl get storageclass -o jsonpath='{.items[?(@.metadata.annotations.storageclass\.kubernetes\.io/is-default-class=="true")].metadata.name}')
api_server=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
END
cat > /home/user/cluster-commands.txt <<'END'
nodes_command=kubectl get nodes -o wide
namespaces_command=kubectl get namespaces
pods_command=kubectl get pods -n kube-system
cluster_info_command=kubectl cluster-info
END
