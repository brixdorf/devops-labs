"""Visit counter: each request increments a counter stored in Redis."""
import os
import socket
from http.server import BaseHTTPRequestHandler, HTTPServer

REDIS_HOST = os.environ.get("REDIS_HOST", "localhost")


def increment():
    with socket.create_connection((REDIS_HOST, 6379), timeout=3) as conn:
        conn.sendall(b"*2\r\n$4\r\nINCR\r\n$6\r\nvisits\r\n")
        reply = conn.recv(64)
    return int(reply[1:].split(b"\r\n")[0])


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            body, status = f"Hello from the web service! Visit number {increment()}.\n", 200
        except OSError as exc:
            body, status = f"Cannot reach Redis at {REDIS_HOST}:6379 ({exc})\n", 500
        self.send_response(status)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(body.encode())

    def log_message(self, fmt, *args):
        print("request:", fmt % args, flush=True)


print(f"web service listening on port 8000, using Redis at {REDIS_HOST}", flush=True)
HTTPServer(("0.0.0.0", 8000), Handler).serve_forever()
