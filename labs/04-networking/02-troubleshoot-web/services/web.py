"""Tiny web server used by the troubleshooting lab: web.py <port> <status>."""
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT = int(sys.argv[1])
STATUS = int(sys.argv[2])


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = b"OK\n" if STATUS == 200 else b"Service Unavailable: database connection pool exhausted\n"
        self.send_response(STATUS)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
