"""Inventory API placeholder: reports the Django version it ships with."""
from http.server import BaseHTTPRequestHandler, HTTPServer

import django


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(f"inventory api, django {django.get_version()}\n".encode())


HTTPServer(("0.0.0.0", 8000), Handler).serve_forever()
