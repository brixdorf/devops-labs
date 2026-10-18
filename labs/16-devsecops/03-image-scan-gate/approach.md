1. Read the `Dockerfile` to see how `wheels/` is used.
2. Write `release.yml` with the two jobs and push it.
3. Open the failed run, read the Trivy table, and confirm `deploy` was skipped.
4. Update `requirements.txt`, push, and watch the second run deploy.
5. Check the registry: `curl -s -u {{REGISTRY_USER}}:'{{REGISTRY_PASSWORD}}' http://registry:5000/v2/inventory/api/tags/list`.
