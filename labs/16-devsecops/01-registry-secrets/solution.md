```bash
cd /home/user/shop-web
cat > Dockerfile <<'END'
FROM {{IMAGE_PYTHON}}
COPY app.py /app/app.py
CMD ["python3", "/app/app.py"]
END
```

Add the secrets `REGISTRY_USERNAME` = `{{REGISTRY_USER}}` and `REGISTRY_PASSWORD` = `{{REGISTRY_PASSWORD}}` under **Settings, Actions, Secrets** in Gitea.

```bash
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
git commit -m "Build and publish the image"
git push
curl -s -u {{REGISTRY_USER}}:'{{REGISTRY_PASSWORD}}' http://registry:5000/v2/shop/web/tags/list
```
