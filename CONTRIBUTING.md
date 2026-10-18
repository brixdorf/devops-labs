# Contributing

Thanks for helping improve DevOps Labs. Bug reports, lab fixes and new labs are all welcome.

## Report a problem

Open an issue and pick a template:

- **Lab problem**: a lab's question is unclear, its checker marks a correct answer as wrong (or the other way round), or its solution no longer works.
- **Bug report**: the app itself does not install, start, launch labs or behave as expected.

Include your operating system, your Docker version (`docker version`) and the exact steps that led to the problem.

## Change the code or add a lab

1. Fork the repository and create a branch.
2. Make your change. To add or edit a lab, follow [Adding a lab](docs/authoring-labs.md).
3. Run the test suite (see the [maintainer guide](docs/maintainers.md)). Everything runs in Docker:

   ```
   docker compose -f tests/compose.yaml run --build --rm tests
   ```

   While working on one lab, self-test only that lab against a running platform:

   ```
   docker compose exec app node server/selftest.js --lab <lab-id>
   ```

4. Open a pull request that explains what changed and why.

## Style

- Commit messages are one line: `type: lowercase past-tense description`, where `type` is one of `feat`, `fix`, `docs`, `refactor`, `test` or `chore`. For example: `fix: corrected the port in the nginx lab checker`.
- Use plain hyphens, not long dashes, and no emojis.
- Keep the project platform agnostic: everything runs in containers, files use LF line endings, and versions are pinned in `versions.json`.
