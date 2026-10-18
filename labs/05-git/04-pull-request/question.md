## Objective

Your team never commits straight to `main`. Every change goes through a feature branch and a **pull request** (PR) that someone reviews before it is merged. In this lab you go through that whole flow on the local **Gitea** server, which stands in for GitHub.

- Gitea: {{GITEA_URL}} (or the **Open Gitea** button above)
- Username: `{{GITEA_USER}}`, password: `{{GITEA_PASSWORD}}`

The repository `{{GITEA_USER}}/greeter` exists on Gitea and is already cloned to `/home/user/greeter`. Your Gitea credentials are saved for Git, so `git push` does not ask for them.

## Tasks

### Task 1: Create a feature branch

In `/home/user/greeter`, create a branch named `feature/farewell` from `main` and switch to it.

### Task 2: Implement the change

Add a function `farewell(name)` to `greeter.py` that returns the text `Goodbye, <name>!`. For example, `farewell("Ada")` returns `Goodbye, Ada!`. Keep the existing `greet` function unchanged.

Commit the change on `feature/farewell` with a message of at least three words.

### Task 3: Push the branch

Push `feature/farewell` to `origin`.

### Task 4: Open and review a pull request

In Gitea, open a pull request that merges `feature/farewell` into `main`. Give it a title that contains the word `farewell`. Before merging, open the **Files Changed** tab of the PR and review the diff.

### Task 5: Merge and update your local main

Merge the pull request in Gitea. Then switch your local repository back to `main` and pull, so that your local `main` matches `main` on Gitea.

## Notes

- Do not push directly to `main`: the change must reach `main` through the merged pull request.
- Run `python3 -c 'import greeter; print(greeter.farewell("Ada"))'` inside the folder to test your function.

## Expected outcome

A merged pull request from `feature/farewell` into `main`, `main` on Gitea containing a working `farewell` function, and your local `main` up to date.
