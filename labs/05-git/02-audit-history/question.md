## Scenario

You are working with an existing Git repository (`audit-tracker-repo`) that contains multiple commits created by different authors. As part of an audit and troubleshooting exercise, you need to inspect the repository history to identify recent changes and bug fixes.

## Important

Do not manually edit or create the output files. Each file must be generated only by redirecting the output of the appropriate `git` command, for example `git <command> > file.txt`.

## Tasks

Perform all tasks from the root of the repository, `/home/user/audit-tracker-repo`. Feel free to research the different flags that `git log` offers.

### Task 1: View Commit History in Compact Format

Display the commit history in a compact, single-line format.
Redirect the output to: `/home/user/audit-tracker-repo/compact-history.txt`

### Task 2: Identify the Last 3 Commits

Display details of the most recent 3 commits.
Redirect the output to: `/home/user/audit-tracker-repo/last-3-commits.txt`

### Task 3: Identify the Author of the Most Recent Commit

Determine the author name of the latest commit.
Redirect the output to: `/home/user/audit-tracker-repo/latest-author.txt`
The file must contain only the command output (just the name).

### Task 4: Find Bug Fix Commits

Search the commit history for commits related to bug fixes using commit messages. Look for commits whose messages contain the keywords `fix` or `bug`.
Redirect the output to: `/home/user/audit-tracker-repo/bugfix-commits.txt`

### Task 5: Inspect Changes in the Most Recent Commit

Inspect the changes introduced in the latest commit.
Redirect the output to: `/home/user/audit-tracker-repo/latest-commit-changes.txt`

## Validation Criteria

- All required files are present with the exact file names.
- Each file contains valid Git command output.
- No file contains manually typed or edited content.
- The outputs correctly reflect the requested commit history information.
- Do not commit the output files or change the history.

## Expected Learning Outcomes

- Inspect Git history.
- Identify recent commits and commit authors.
- Search commit history using message-based filters.
- Review commit-level changes for auditing and debugging.
- Produce automation-friendly outputs using command redirection.
