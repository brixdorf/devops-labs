```bash
cd /home/user/inventory-api
mkdir -p .gitea/workflows
cat > .gitea/workflows/release.yml <<'END'
name: Release
on: push

jobs:
  build-and-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - name: Provide the Python packages
        run: cp -r /opt/wheels wheels
      - name: Build the image
        run: docker build -t registry:5000/inventory/api:${{ github.sha }} .
      - name: Scan the image
        run: trivy image --severity CRITICAL --pkg-types library --ignore-unfixed --exit-code 1 registry:5000/inventory/api:${{ github.sha }}

  deploy:
    runs-on: ubuntu-latest
    needs: build-and-scan
    steps:
      - name: Log in to the registry
        run: echo "${{ secrets.REGISTRY_PASSWORD }}" | docker login registry:5000 -u "${{ secrets.REGISTRY_USERNAME }}" --password-stdin
      - name: Push the release
        run: |
          docker tag registry:5000/inventory/api:${{ github.sha }} registry:5000/inventory/api:prod
          docker push registry:5000/inventory/api:${{ github.sha }}
          docker push registry:5000/inventory/api:prod
END
git add .gitea && git commit -m "Add release pipeline with image scan" && git push     # scan fails, deploy skipped

echo "{{PIP_DJANGO}}" > requirements.txt
git commit -am "Upgrade Django to a patched version" && git push                    # scan passes, deploy runs
```
