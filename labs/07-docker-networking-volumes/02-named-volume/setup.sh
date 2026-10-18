#!/bin/bash
docker pull -q "$IMAGE_POSTGRES" >/dev/null 2>&1 || true
rm -f /home/user/student-count.txt
