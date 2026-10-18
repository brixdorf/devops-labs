"""orders-api: a sample service that exposes Prometheus metrics on :8000/metrics.

It simulates its own traffic so that request rate, errors and latency change
over time. Only the standard library is used.
"""
import random
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

BUCKETS = [0.05, 0.1, 0.25, 0.5, 1.0, 2.5]
lock = threading.Lock()
requests = {}
buckets = {b: 0 for b in BUCKETS}
duration_sum = 0.0
duration_count = 0
queue = 0


def observe(path, status, seconds):
    global duration_sum, duration_count
    with lock:
        key = ("GET", path, str(status))
        requests[key] = requests.get(key, 0) + 1
        for b in BUCKETS:
            if seconds <= b:
                buckets[b] += 1
        duration_sum += seconds
        duration_count += 1


def simulate():
    global queue
    while True:
        path = random.choice(["/api/orders", "/api/orders", "/api/orders/42", "/api/cart"])
        status = 500 if random.random() < 0.07 else 200
        observe(path, status, random.lognormvariate(-2.3, 0.7))
        with lock:
            queue = max(0, queue + random.choice([-1, 0, 1]))
        time.sleep(random.uniform(0.05, 0.25))


def metrics_text():
    lines = [
        "# HELP http_requests_total Total HTTP requests handled.",
        "# TYPE http_requests_total counter",
    ]
    with lock:
        for (method, path, status), value in sorted(requests.items()):
            lines.append(f'http_requests_total{{method="{method}",path="{path}",status="{status}"}} {value}')
        lines += [
            "# HELP http_request_duration_seconds Time spent handling HTTP requests.",
            "# TYPE http_request_duration_seconds histogram",
        ]
        for b in BUCKETS:
            lines.append(f'http_request_duration_seconds_bucket{{le="{b}"}} {buckets[b]}')
        lines.append(f'http_request_duration_seconds_bucket{{le="+Inf"}} {duration_count}')
        lines.append(f"http_request_duration_seconds_sum {duration_sum:.6f}")
        lines.append(f"http_request_duration_seconds_count {duration_count}")
        lines += [
            "# HELP orders_in_queue Orders waiting to be processed.",
            "# TYPE orders_in_queue gauge",
            f"orders_in_queue {queue}",
        ]
    return "\n".join(lines) + "\n"


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/metrics":
            body, ctype = metrics_text().encode(), "text/plain; version=0.0.4"
        else:
            body, ctype = b'{"orders": []}\n', "application/json"
            observe(self.path, 200, 0.01)
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


threading.Thread(target=simulate, daemon=True).start()
ThreadingHTTPServer(("0.0.0.0", 8000), Handler).serve_forever()
