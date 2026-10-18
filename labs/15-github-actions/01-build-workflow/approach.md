1. `cd /home/user/calculator && mkdir -p .gitea/workflows`
2. Write `ci.yml` with `nano`: name, trigger, the `build` job with `runs-on: ubuntu-latest`, and three steps.
3. `git add .gitea/workflows/ci.yml && git commit -m "Add CI workflow" && git push`
4. In Gitea, open the repository, then **Actions**, and click the run to follow the log.
