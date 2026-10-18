#!/bin/bash
# Starts the lab's private Docker engine in the background.
nohup dockerd >/var/log/dockerd.log 2>&1 &
for _ in $(seq 1 60); do
  docker info >/dev/null 2>&1 && break
  sleep 0.5
done
