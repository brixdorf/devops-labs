## Objective

You wrote a small to-do application and now want it under version control and published on the team's Git server. In this lab, a local **Gitea** server stands in for GitHub. Open it from the **Open Gitea** button above, or at {{GITEA_URL}}.

Gitea account (already created for you):

- Username: `{{GITEA_USER}}`
- Password: `{{GITEA_PASSWORD}}`

The application files are in `/home/user/todo-app/`. The folder is not a Git repository yet.

## Tasks

### Task 1: Initialize the repository

Turn `/home/user/todo-app` into a Git repository whose branch is named `main`. Set your name and email in Git (any values, but the email must look like an email address).

### Task 2: Add a README

Create `/home/user/todo-app/README.md`. Its first line must be exactly `# Todo App`, followed by at least one line that describes the application.

### Task 3: Make at least three meaningful commits

Commit the work in **at least three** separate commits. Each commit message must:

- have at least three words, and
- be different from the other messages.

For example: `Add to-do list module`, `Add README with usage`, `Add tests for the to-do list`.

### Task 4: Push to Gitea

1. Create a repository named `todo-app` in Gitea under your account (with the **+** menu, then **New Repository**). Leave it empty: do not add a README or license there.
2. Add it as the remote named `origin`, using the address `{{GITEA_URL}}/{{GITEA_USER}}/todo-app.git`.
3. Push `main` and set it to track `origin/main`.

Git asks for your username and password when you push.

## Notes

- Commit all files in the folder, including the README.
- Everything you push must be committed: the latest local commit and the latest commit on Gitea must be the same.

## Expected outcome

The `todo-app` repository on Gitea contains your README and at least three meaningful commits, identical to your local `main` branch.
