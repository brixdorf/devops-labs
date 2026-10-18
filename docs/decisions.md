# Decisions

Short notes on choices made while building DevOps Labs, and why.

## Platform

- **One app container, Node.js.** The backend (Express, `ws`, `dockerode`) and the web UI (plain JavaScript built with Vite, xterm.js for terminals) ship in one image. The app talks to Docker only through the mounted Docker socket.
- **Node.js LTS line.** The app image uses the newest Node.js LTS release rather than the newest "Current" release, because LTS is the stable line for running services.
- **Default port 8800.** It is rarely used by other tools. `DEVOPS_LABS_PORT` in a `.env` file changes it. Add-on web interfaces use 8801 to 8804 and can be changed the same way. All ports are bound to `127.0.0.1` only.
- **Images are built by the app with the classic builder** through the Engine API, from folders baked into the app image. Each image is tagged with a hash of its folder and its pinned versions, so a `git pull` followed by `docker compose up -d --build` rebuilds exactly the environments that changed, the first time they are needed. Upstream images that were downloaded only to build from are untagged afterwards, so every image the project leaves on disk carries the project label.
- **Session-scoped add-on data.** Gitea, the registry, Prometheus, Grafana, Argo CD and Moto start fresh with every lab session and are removed when it stops. Every lab therefore starts from a known state, which keeps checkers reliable. Reset everything still removes any data volume that survived a crash. The only data kept between sessions is the image download cache (see below), which Reset everything keeps on purpose.
- **Image download cache.** Docker Hub and Quay images pulled inside labs (Docker in Docker and k3s) go through local pull-through registry caches kept in labelled volumes. After the first download, relaunches do not need the internet and are fast. Kubernetes labs pin every image tag so the cache is always used.
- **Add-on web interfaces.** They are published on localhost ports and opened from the question panel. Inside the lab container the same `http://localhost:<port>` address works, through small `socat` forwarders, so URLs in lab text work in both the browser and the terminal. Gitea's `ROOT_URL` is that address, which also keeps Gitea Actions checkouts working.
- **Self-test endpoint.** The automated solution runs through `/api/selftest/solve`, protected by a random token that is written inside the app container on start. Only `node server/selftest.js`, run inside the container, can read it.
- **Session log.** The app records the output of every terminal tab of a session (which includes typed commands, as echoed by the shell). The browser stores a copy with each submission, capped in size, and shows it in a read-only terminal so colours and line editing render correctly.

## Environments

- **Ubuntu 26.04 LTS** is the base. GNU coreutils replace the default Rust coreutils so commands behave as most tutorials describe and have man pages. Ubuntu's archive keeps only the newest package versions, so individual apt packages are not pinned; the Ubuntu image is pinned by its dated tag instead. Ubuntu's snapshot service was not reachable from the build environment.
- **systemd:** real systemd runs as PID 1 in a privileged container with a private cgroup namespace. It runs reliably on Docker Desktop, so no systemctl imitation is needed. Units that make no sense in a container (udev, getty, logind, kernel modules) are masked.
- **docker:** Docker CE from Docker's apt repository, pinned by version, with the Compose and Buildx plugins. `/var/lib/docker` is a session volume so the inner engine does not run overlay on overlay.
- **kubernetes:** k3s in a privileged container on the lab network, with a fresh data volume per launch, so every launch starts from a clean cluster. Traefik, local-path storage and metrics-server are the k3s defaults and are waited for before the lab is ready. The lab container reaches the node as `k3s`, so NodePort and Ingress labs use `curl http://k3s:<port>`.
- **terraform:** providers (aws, local, random, null) are downloaded at image build time into a filesystem mirror. `terraform init` links them instead of downloading, which takes under a second and works offline.
- **Downloads are verified.** kubectl, Helm, Terraform, Node.js, Trivy and Gitleaks are downloaded as pinned release files and checked against their published SHA-256 checksums. Docker's apt key is checked against its published fingerprint. The correct CPU architecture (amd64 or arm64) is chosen at build time.

## Add-ons

- **Gitea Actions** with `act_runner` in host mode: jobs run directly in a runner container that has its own Docker engine, Node.js, Python, Trivy, Gitleaks and Bandit. `actions/checkout`, `actions/upload-artifact` and `actions/download-artifact` are cloned at build time and served by Gitea itself (`DEFAULT_ACTIONS_URL=self`), so workflows do not need github.com. The newest major versions of these actions were verified against this Gitea version by running the GitHub Actions labs.
- **Python packages for workflows** come from a folder of wheels baked into the runner (pytest, Flask and friends), so `pip install -r requirements.txt` works offline.
- **Security scanners:** Bandit (SAST for Python), Trivy (dependency and container image scanning, with its vulnerability database downloaded at build time) and Gitleaks (secret scanning). All are actively maintained open-source tools. No Bitnami images or charts are used.
- **AWS stand-in:** Moto server. LocalStack is not used because it now needs an account and an auth token.
- **Argo CD** is installed from the pinned upstream manifest into the lab cluster, with Dex and the notifications controller scaled to zero to save memory, a fixed practice password, and plain HTTP on a node port published to localhost. CoreDNS gets a hosts entry for Gitea so Argo CD can clone from it.

## Install and uninstall

- **Stop** is `docker compose down`. The app removes all lab resources when it receives the stop signal, and again on the next start in case it was killed.
- **Uninstall** is `docker compose run --rm uninstall`, a second service using the app image. It removes every container (including the ones the app started), volume, network, image and build cache entry with the project label. A container cannot delete the image it runs from, so as the last step it starts a helper container from a one-line copy of its image, deletes that copy (a created container keeps the layers it needs), and starts the helper, which waits for the uninstall container to exit and then removes the last image and network.
- **Build cache.** BuildKit cache records cannot carry labels. The uninstall removes records whose description mentions the project path `/opt/devops-labs` (every build step of the app image does) and their descendants. Records BuildKit marks as still referenced may survive; they hold no images, containers, volumes or networks.

## Tests

- **One command** runs everything: `docker compose -f tests/compose.yaml run --build --rm tests`. Maintainer tools mount the repository, because they write test output and version updates into it. The platform itself never bind-mounts host paths.
- **The install test is destructive by design.** It ends with the documented uninstall, so after the full suite the platform has to be started again with `docker compose up -d`.
- **Checkers run as root** from a temporary folder that exists only during the submission. Setup scripts can pass private data (for example a randomly chosen file name) to the checker through a context file that is read by the app and removed from the lab container.
- **"Explain" and "diagram" tasks** are converted into structured answer files (for example `key: value` files, choosing statement IDs from an options file, or ordering given items), so they can be checked automatically while keeping the learning goal.
