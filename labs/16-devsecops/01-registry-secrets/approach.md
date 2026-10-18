1. Write a three-line Dockerfile (FROM, COPY, CMD) and test it locally with `docker build`.
2. Add the two secrets in Gitea's repository settings.
3. Write `publish.yml` with the checkout, login, build and push steps.
4. `git add`, `git commit`, `git push`, and follow the run in the Actions tab.
5. Query the registry's tag list to confirm the push.
