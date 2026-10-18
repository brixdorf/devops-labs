#!/bin/bash
set -euo pipefail
docker network create app-net >/dev/null
docker run -d --name api --network app-net "$IMAGE_NGINX" >/dev/null
docker run -d --name client --network app-net "$IMAGE_BUSYBOX" sleep 3600 >/dev/null
for _ in $(seq 1 30); do docker exec client wget -qO- http://api > /home/user/name-test.txt 2>/dev/null && break; sleep 1; done
ip=$(docker inspect -f '{{(index .NetworkSettings.Networks "app-net").IPAddress}}' api)
subnet=$(docker network inspect -f '{{(index .IPAM.Config 0).Subnet}}' app-net)
printf 'api_ip=%s\nsubnet=%s\n' "$ip" "$subnet" > /home/user/network-details.txt
