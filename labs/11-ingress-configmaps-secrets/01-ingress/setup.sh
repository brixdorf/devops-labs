#!/bin/bash
set -euo pipefail
kubectl create namespace web >/dev/null
kubectl create deployment shop --image="$IMAGE_NGINX" --port=80 -n web >/dev/null
kubectl create deployment blog --image="$IMAGE_HTTPD" --port=80 -n web >/dev/null
rm -rf /home/user/ingress
