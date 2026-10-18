#!/bin/bash
set -euo pipefail
cd /home/user/shop-web
cat > Dockerfile <<END
FROM $IMAGE_PYTHON
COPY app.py /app/app.py
CMD ["python3", "/app/app.py"]
END
auth="Authorization: Basic $(printf '%s:%s' "$GITEA_USER" "$GITEA_PASSWORD" | base64 -w0)"
for pair in "REGISTRY_USERNAME=$REGISTRY_USER" "REGISTRY_PASSWORD=$REGISTRY_PASSWORD"; do
  name=${pair%%=*} value=${pair#*=}
  body=$(python3 -c 'import json,sys; print(json.dumps({"data": sys.argv[1]}))' "$value")
  curl -sf -H "$auth" -H 'Content-Type: application/json' -X PUT "$GITEA_URL/api/v1/repos/$GITEA_USER/shop-web/actions/secrets/$name" -d "$body" >/dev/null
done
mkdir -p .gitea/workflows
cat > .gitea/workflows/publish.yml <<'END'
name: Publish
on: push

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - name: Log in to the registry
        run: echo "${{ secrets.REGISTRY_PASSWORD }}" | docker login registry:5000 -u "${{ secrets.REGISTRY_USERNAME }}" --password-stdin
      - name: Build the image
        run: docker build -t registry:5000/shop/web:${{ github.sha }} .
      - name: Push the image
        run: docker push registry:5000/shop/web:${{ github.sha }}
END
git add Dockerfile .gitea
git commit -qm "Build and publish the image"
git push -q
