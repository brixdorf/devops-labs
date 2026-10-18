"""Shop web front end."""
from http.server import BaseHTTPRequestHandler, HTTPServer


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"shop web is running\n")


HTTPServer(("0.0.0.0", 8000), Handler).serve_forever()
