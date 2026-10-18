#!/bin/bash
set -euo pipefail
dir=/home/user/status-api
rm -rf "$dir"
mkdir -p "$dir/notes"
cat > "$dir/app.py" <<'END'
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = json.dumps({"app": "status-api", "env": os.environ.get("APP_ENV", "development")}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body)


HTTPServer(("0.0.0.0", 5000), Handler).serve_forever()
END
cat > "$dir/Dockerfile" <<END
FROM $IMAGE_PYTHON
WORKDIR /app
COPY . .
CMD ["python3", "app.py"]
END
echo "DB_PASSWORD=$(openssl rand -hex 8)" > "$dir/secrets.env"
echo "2026-01-01 started" > "$dir/app.log"
echo "2026-01-01 debug" > "$dir/debug.log"
echo "Remember to rotate the database password." > "$dir/notes/todo.md"
statements=(
  "dockerignore|It excludes files from the build context, so they are never sent to the builder or copied into the image."
  "env|It sets an environment variable that is stored in the image and available to every container started from it."
  "wrong|It deletes the listed files from the project folder after the build."
  "wrong|It encrypts the listed files inside the image."
  "wrong|It sets a variable only on the machine that builds the image, not in the container."
  "wrong|It publishes the container port on the host."
)
json="{" n=1
: > "$dir/statements.txt"
for i in $(printf '%s\n' "${!statements[@]}" | shuf); do
  echo "S$n: ${statements[$i]#*|}" >> "$dir/statements.txt"
  kind=${statements[$i]%%|*}
  [ "$kind" != wrong ] && json+="\"$kind\": \"S$n\", "
  n=$((n + 1))
done
chown -R user:user "$dir"
docker pull -q "$IMAGE_PYTHON" >/dev/null 2>&1 || true
printf '%s}\n' "${json%, }" > "$LAB_CONTEXT_FILE"
