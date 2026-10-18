#!/bin/bash
# Starts the orders-api sample service in the background on port 8000.
# Source it from a setup script: . "$LAB_DIR/lib/orders-api.sh"
install -d /opt/orders-api
cp "$LAB_DIR/lib/orders_api.py" /opt/orders-api/orders_api.py
setsid nohup python3 /opt/orders-api/orders_api.py >/var/log/orders-api.log 2>&1 < /dev/null &
for _ in $(seq 1 20); do curl -sf http://localhost:8000/metrics >/dev/null && break; sleep 0.5; done
