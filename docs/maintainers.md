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
| `unit` | Backend unit tests (session lifecycle, idle timeout, one lab at a time, checker parsing, cleanup), API tests for every endpoint and the terminal WebSocket, lab folder validation, and a lint of every lab script. |
| `e2e` | Playwright browser tests of the full student flow: pick a topic and lab, launch, type in the terminal, use two terminal tabs, submit (Wrong Answer, then Correct Answer), session log, hints and the score penalty, submissions, Stop Lab, Reset progress and Reset everything. |
| `selftest` | For every lab: launch, the checker must fail, run the automated solution, the checker must pass. |
| `install` | Runs the documented commands: `docker compose up -d`, launches one lab of every environment, `docker compose down`, `docker compose run --rm uninstall`, then confirms that nothing with the project label remains. |

The `install` stage ends with an uninstall, so start the platform again afterwards with `docker compose up -d`.

Useful options (append after `tests`):

```
docker compose -f tests/compose.yaml run --build --rm tests node tests/run-all.mjs --skip install
docker compose -f tests/compose.yaml run --build --rm tests node tests/run-all.mjs --only selftest --labs --topic docker
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

To see what would change without writing anything:

```
docker compose -f tests/compose.yaml run --build --rm update node tools/update-versions.mjs --dry-run
```

Notes:

- The Ubuntu base image follows its LTS release line (the codename in `versions.json`). Moving to the next LTS release is a deliberate manual change.
- `lab_fixed` in `versions.json` holds deliberately old, known-vulnerable versions used by the DevSecOps labs. The update command never changes them.
- `podinfo_previous` is the newest release of the minor line before `podinfo`, so the rolling update lab always has two versions.

## Add a lab

See [authoring-labs.md](authoring-labs.md).
