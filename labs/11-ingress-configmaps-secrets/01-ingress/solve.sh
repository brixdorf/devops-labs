#!/bin/bash
set -euo pipefail
kubectl expose deployment shop --name=shop-svc --port=80 -n web
kubectl expose deployment blog --name=blog-svc --port=80 -n web
kubectl create ingress site-ingress -n web --class=traefik --rule='shop.devops.local/*=shop-svc:80' --rule='blog.devops.local/*=blog-svc:80'
kubectl rollout status deployment/shop -n web --timeout=300s
kubectl rollout status deployment/blog -n web --timeout=300s
mkdir -p /home/user/ingress
for _ in $(seq 1 30); do
  curl -sf -H 'Host: shop.devops.local' http://k3s/ > /home/user/ingress/shop.html && curl -sf -H 'Host: blog.devops.local' http://k3s/ > /home/user/ingress/blog.html && break
  sleep 2
done
