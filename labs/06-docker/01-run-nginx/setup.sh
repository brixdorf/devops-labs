#!/bin/bash
# Warm the image cache so the first pull is quick for the student.
docker pull -q nginx >/dev/null 2>&1 || true
rm -f /home/user/web-logs.txt
