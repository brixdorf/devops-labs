#!/bin/bash
set -euo pipefail
printf 'endpoints_before=0\nservice_selector=app=front-end\npod_labels=app=frontend\n' > /home/user/diagnosis.txt
kubectl patch service frontend-svc -p '{"spec":{"selector":{"app":"frontend"}}}'
sleep 3
