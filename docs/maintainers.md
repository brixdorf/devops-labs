# Maintainer guide

This page is for the repository owner. Students only need the README.

All commands run from the repository root and are the same on Windows, macOS and Linux. They need only Docker and Git.

## Run the whole test suite

```
docker compose -f tests/compose.yaml run --build --rm tests
```

The suite runs these stages in order and prints a summary:

| Stage | What it checks |
| --- | --- |
| `rules` | No long dashes, emojis or banned words in tracked files; commit messages follow `type: lowercase past-tense description`; author and committer are `brixdorf <itsromit@protonmail.com>`; the private brief was never committed; pinned versions in Dockerfiles and package files match `versions.json`. |
| `unit` | Backend unit tests (session lifecycle, idle timeout, one lab at a time, checker parsing, cleanup, image builds and checks), API tests for every endpoint and the terminal WebSocket, browser progress (including progress saved by v1.0.0), lab folder validation, every Dockerfile failing the build when a command fails, and a lint of every lab script. |
| `images` | Builds every environment and add-on image from scratch, with fresh upstream images and no build cache, and runs each image's tool check. |
| `offline` | Builds the Terraform and simulated services images on an internal Docker network, which has no internet, as if the connection dropped mid-build. Each build must fail with a clear message and leave no containers or images behind, and building again with the connection back must work without any cleanup. |
| `e2e` | Playwright browser tests of the full student flow (plus the message and Try Again button after a launch that lost the internet connection): pick a topic and lab, launch, type in the terminal, use two terminal tabs and switch them with Ctrl+Shift+PageUp/PageDown, submit (Wrong Answer, then Correct Answer), session log from the test results and from every submission, hints and the solution, submissions, Stop Lab, Reset progress and Reset everything, and progress saved by v1.0.0. |
| `selftest` | For every lab: launch, the checker must fail, run the automated solution, the checker must pass. |
| `upgrade` | Installs v1.0.0, solves a lab in the browser and leaves a Docker lab running, then updates with `docker compose up -d --build` and checks that the app starts cleanly, the browser progress is kept, old lab containers and images are gone, and labs launch. |
| `install` | Runs the documented commands as a fresh install: `docker compose up -d` (without the app image, and without a "pull access denied" warning), launches one lab of every environment, `docker compose down`, `docker compose run --rm uninstall`, then confirms that nothing with the project label remains. |

The `install` stage ends with an uninstall, so start the platform again afterwards with `docker compose up -d`.

Useful options (append after `tests`):

```
docker compose -f tests/compose.yaml run --build --rm tests node tests/run-all.mjs --skip install
docker compose -f tests/compose.yaml run --build --rm tests node tests/run-all.mjs --only selftest --labs --topic docker
docker compose -f tests/compose.yaml run --build --rm tests node tests/run-all.mjs --only versions
```

The `versions` stage only runs when asked for (`--only versions` or `--with versions`). It fails when any entry in `versions.json` is not the newest stable release, which means it is time to run the update command below. It is left out of the default run so that a new upstream release does not fail the suite.

To build one environment or add-on image from scratch and check it, against a running platform:

```
docker compose exec app node server/build-images.js --no-cache docker
```

A single lab can also be self-tested against a running platform:

```
docker compose exec app node server/selftest.js --lab linux-basic-commands
```

## Update every pinned version

```
docker compose -f tests/compose.yaml run --build --rm update
```

This command:

1. looks up the newest stable version of every entry in `versions.json` (Docker Hub, GitHub releases, npm, PyPI, the Terraform registry, Node.js LTS releases and Docker's apt repository),
2. writes the new versions to `versions.json` and copies them into the Dockerfiles and `package.json` files that cannot read it directly (`tools/sync-versions.mjs`),
3. refreshes the npm lock files,
4. rebuilds the app and test images (environment images rebuild automatically, because their tags are hashes of their inputs),
5. runs the full test suite,
6. prints a report of every version that changed and of each step's result.

Review the changes with `git diff`, then commit them. Set `GITHUB_TOKEN` in your shell before running it if you hit GitHub's rate limit for anonymous requests.

To see what would change without writing anything (`--check` does the same and exits with an error when anything is outdated):

```
docker compose -f tests/compose.yaml run --build --rm update node tools/update-versions.mjs --dry-run
```

Notes:

- The Ubuntu base image follows its LTS release line (the codename in `versions.json`). Moving to the next LTS release is a deliberate manual change.
- `lab_fixed` in `versions.json` holds deliberately old, known-vulnerable versions used by the DevSecOps labs. The update command never changes them.
- `podinfo_previous` is the newest release of the minor line before `podinfo`, so the rolling update lab always has two versions.

## Add a lab

See [authoring-labs.md](authoring-labs.md).
