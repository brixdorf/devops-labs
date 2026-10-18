#!/bin/bash
docker pull -q "$IMAGE_NGINX" >/dev/null 2>&1 || true
docker pull -q "$IMAGE_BUSYBOX" >/dev/null 2>&1 || true
rm -f /home/user/name-test.txt /home/user/network-details.txt
