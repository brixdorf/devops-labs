#!/bin/bash
set -euo pipefail
cd /home/user/site
cat > Dockerfile <<END
FROM $IMAGE_PYTHON
WORKDIR /srv/site
COPY index.html .
CMD ["python3", "-m", "http.server", "8000"]
END
docker build -q -t my-site:1.0 . >/dev/null
docker run -d --name site -p 8081:8000 my-site:1.0 >/dev/null
for _ in $(seq 1 30); do curl -sf http://localhost:8081 >/dev/null && break; sleep 1; done
