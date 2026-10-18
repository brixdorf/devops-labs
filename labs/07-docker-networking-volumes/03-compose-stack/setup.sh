#!/bin/bash
set -euo pipefail
dir=/home/user/stack
rm -rf "$dir"
mkdir -p "$dir/app"
cp "$LAB_DIR/files/app/app.py" "$dir/app/app.py"
cat > "$dir/app/Dockerfile" <<END
FROM $IMAGE_PYTHON
WORKDIR /app
COPY app.py .
CMD ["python3", "-u", "app.py"]
END
chown -R user:user "$dir"
docker pull -q "$IMAGE_PYTHON" >/dev/null 2>&1 || true
docker pull -q "$IMAGE_REDIS" >/dev/null 2>&1 || true
