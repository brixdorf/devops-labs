"""Inventory API: answers GET /health on the configured port."""
import json
import os
import socket
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

CONFIG = "/etc/inventory/inventory.conf"


def fail(message):
    print(f"ERROR: {message}", file=sys.stderr, flush=True)
    sys.exit(1)


settings = {}
with open(CONFIG, encoding="utf-8") as fh:
    for line in fh:
        if "=" in line and not line.strip().startswith("#"):
            key, value = line.strip().split("=", 1)
            settings[key.strip()] = value.strip()

raw_port = settings.get("PORT", "")
if not raw_port.isdigit():
    fail(f"invalid PORT value '{raw_port}' in {CONFIG}")
port = int(raw_port)
data_dir = settings.get("DATA_DIR", "/var/lib/inventory")
try:
    with open(os.path.join(data_dir, "heartbeat"), "w", encoding="utf-8") as fh:
        fh.write("alive\n")
except OSError as exc:
    fail(f"cannot write to {data_dir}: {exc.strerror}")

probe = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
try:
    probe.bind(("0.0.0.0", port))
except OSError:
    fail(f"port {port} is already in use by another process")
probe.close()


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = json.dumps({"service": "inventory", "status": "ok"}).encode()
        self.send_response(200 if self.path == "/health" else 404)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        print(fmt % args, flush=True)


print(f"inventory listening on port {port}", flush=True)
HTTPServer(("0.0.0.0", port), Handler).serve_forever()
