#!/bin/bash
set -euo pipefail
. "$LAB_DIR/lib/gitea.sh"
repo="$LAB_DIR/files/repo"
cat > "$repo/Dockerfile" <<END
FROM $IMAGE_PYTHON
WORKDIR /app
COPY wheels/ /wheels/
COPY requirements.txt .
RUN pip install --no-cache-dir --no-index --find-links /wheels -r requirements.txt
COPY app.py .
CMD ["python3", "app.py"]
END
printf '%s\n' "$PIP_DJANGO_VULNERABLE" > "$repo/requirements.txt"
gitea_user_git_setup
gitea_seed_repo inventory-api "$repo"
for pair in "REGISTRY_USERNAME=$REGISTRY_USER" "REGISTRY_PASSWORD=$REGISTRY_PASSWORD"; do
  name=${pair%%=*} value=${pair#*=}
  body=$(python3 -c 'import json,sys; print(json.dumps({"data": sys.argv[1]}))' "$value")
  gitea_api -X PUT "$GITEA_URL/api/v1/repos/$GITEA_USER/inventory-api/actions/secrets/$name" -d "$body" >/dev/null
done
