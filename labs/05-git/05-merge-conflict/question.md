## Scenario

Two developers changed the same line of the shop's home page on different branches. When the branches are merged, Git cannot decide which version to keep and reports a **merge conflict**. You will create the conflict by merging, resolve it by hand, commit the resolution and check the resulting history.

The repository is `/home/user/website`. It has two branches:

- `main`, where the page title was changed to `Northwind Shop`
- `feature/new-title`, where the same line was changed to `Welcome Home`

## Tasks

### Task 1: Merge and hit the conflict

On `main`, merge `feature/new-title`. Git reports a conflict in `index.html`.

### Task 2: Resolve the conflict

Edit `index.html` so that:

- the conflicting line becomes exactly `  <title>Northwind Shop | Welcome Home</title>` (two spaces of indentation, as in the rest of the file),
- all conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) are gone,
- every other line of the file stays as it was.

### Task 3: Commit the resolution

Mark the file as resolved and commit the merge, so that `main` ends with a **merge commit** that has both branches as parents.

### Task 4: Verify the history

Save the graph of the history of all branches into `/home/user/merge-history.txt` by running:

```
git log --oneline --graph --all > /home/user/merge-history.txt
```

## Notes

- Do not use `git merge -X ours` or `-X theirs`, and do not rebase: the result must be a real merge with your resolution.
- `git status` tells you which files are in conflict and what to do next.

## Expected outcome

`main` ends in a merge commit of `feature/new-title`, `index.html` has the combined title and no conflict markers, and `merge-history.txt` shows the merge in the graph.
