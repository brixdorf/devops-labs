"""Web servers for the DNS lab.

sites.py http   plain HTTP site on port 80 (shop.devops.lab)
sites.py https  HTTPS site on port 443 with a self-signed certificate, and a
                redirect from port 80 to HTTPS (secure.devops.lab)
"""
import ssl
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

MODE = sys.argv[1]


class Site(BaseHTTPRequestHandler):
    def do_GET(self):
        if MODE == "http" and self.path == "/old-catalog":
            self.send_response(301)
            self.send_header("Location", "/catalog")
            self.end_headers()
            return
        body = f"Welcome to {self.headers.get('Host', 'the site')}\n".encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


class Redirect(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(301)
        self.send_header("Location", f"https://secure.devops.lab{self.path}")
        self.end_headers()

    def log_message(self, *args):
        pass


if MODE == "http":
    ThreadingHTTPServer(("0.0.0.0", 80), Site).serve_forever()
else:
    subprocess.run(
        ["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "30", "-subj", "/CN=secure.devops.lab",
         "-addext", "subjectAltName=DNS:secure.devops.lab", "-keyout", "/tmp/key.pem", "-out", "/tmp/cert.pem"],
        check=True, capture_output=True,
    )
    threading.Thread(target=ThreadingHTTPServer(("0.0.0.0", 80), Redirect).serve_forever, daemon=True).start()
    server = ThreadingHTTPServer(("0.0.0.0", 443), Site)
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain("/tmp/cert.pem", "/tmp/key.pem")
    server.socket = ctx.wrap_socket(server.socket, server_side=True)
    server.serve_forever()
