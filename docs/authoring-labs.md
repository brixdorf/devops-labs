# Adding a lab

Every lab is a folder under `labs/<NN-topic>/`. Folders are sorted by name, so prefix them with a number (`04-my-lab`). Topics are folders with a `topic.yaml` (`id`, `name`, `order`, `description`).

## Files

| File | Purpose |
| --- | --- |
| `lab.yaml` | Metadata, see below. |
| `question.md` | The lab text in Markdown: title, scenario, numbered tasks with exact names and paths, notes, expected outcome. |
| `hint.md` | Hint 1. A nudge, not the answer. |
| `approach.md` | Solution Approach: the steps, without every command. |
| `solution.md` | Complete Solution: the commands. |
| `setup.sh` | Runs as root inside the lab container before the student gets the terminal. Prepares the lab state. |
| `check.py` | The checker. Runs as root at submit time only, then is removed. |
| `solve.sh` | The automated solution. Runs as `user`, only during the self-test. |
| `files/` | Optional. Copied next to `setup.sh` (available as `$LAB_DIR/files/...`). |
| `services/` | Optional. Files for simulated services (see `services` below). |

### lab.yaml

```yaml
id: linux-my-lab           # unique, lowercase letters, digits and dashes
title: My Lab
topic: linux               # must match the topic folder's topic.yaml id
order: 7                   # position in the topic
environment: base          # base, systemd, docker, kubernetes or terraform
addons: []                 # any of: gitea, registry, moto, prometheus, grafana, argocd
timeouts:                  # optional, in seconds
  setup: 600
  check: 180
  solve: 900
services:                  # optional simulated services on the lab network
  - name: web              # also its host name
    files: services        # folder copied to /srv in the service container
    command: python3 /srv/web.py
    readyPort: 8080        # the lab waits until this port accepts connections
```

## Writing the scripts

- `setup.sh` and `check.py` get environment variables: `LAB_DIR`, `LAB_CONTEXT_FILE`, `SUDO_PASSWORD`, `GITEA_URL`, `GITEA_USER`, `GITEA_PASSWORD`, `GRAFANA_URL`, `PROMETHEUS_URL`, `ARGOCD_URL`, `REGISTRY_USER`, `REGISTRY_PASSWORD`, and `IMAGE_NGINX`, `IMAGE_PYTHON` and friends with the pinned image tags.
- Never type an image version into a lab. Use `{{IMAGE_NGINX}}` in Markdown and `$IMAGE_NGINX` in scripts; the values come from `versions.json`.
- Lab text can also use `{{GITEA_URL}}`, `{{GITEA_USER}}`, `{{GITEA_PASSWORD}}`, `{{GRAFANA_URL}}` and the other names above.
- To pass private data from setup to the checker (for example a randomly chosen file name), write JSON to `$LAB_CONTEXT_FILE` in `setup.sh` and read it with `context()` in `check.py`. The file is removed from the lab container after setup.
- Randomize what you can (file names, which service is broken), so a lab cannot be solved by copying an answer.

## Writing the checker

```python
from labcheck import Checker, ensure, quote, read

c = Checker()


@c.test("greeting.txt says hello")
def _():
    text = read("/home/user/greeting.txt").strip()
    ensure(text == "hello", f"Expected 'hello' but found {quote(text)}")
    return "greeting.txt says hello"


@c.test("something that builds on the first test", requires=["greeting.txt says hello"])
def _():
    ...


c.run()
```

- Each test returns a short success message or fails with `ensure(condition, message)` / `fail(message)`. An unexpected exception is reported as a checker error.
- Check real system state (a running service, a Kubernetes object, a Gitea repository), not only that a file exists.
- Give specific failure reasons: `Expected owner nobody:nogroup but found root:root`.
- Accept every valid way of doing the task, unless the task requires a specific method.
- An untouched lab must never pass. The self-test enforces this.
- Helpers in `labs/_lib/labcheck.py`: `run`, `read`, `lines`, `owner`, `mode`, `http`, `http_json`, `kubectl`, `k8s`, `in_cluster`, `wait_until`, `json_in`, `gitea_api`, `context`, `quote`. PyYAML (`import yaml`) is installed for parsing manifests and workflow files.

## Testing a lab

```
docker compose up -d --build
docker compose exec app node server/selftest.js --lab <lab-id>
```

The self-test launches the lab, runs the checker and expects a failure, runs `solve.sh`, then runs the checker again and expects every test to pass. The full test suite (see `docs/maintainers.md`) also checks that every lab folder is complete.
