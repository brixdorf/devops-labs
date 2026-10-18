## Objective

A new team member joins the DevOps team for an exam project. You will create their account, a team group, and a shared project directory that only the team can use.

Password for sudo: `user@123!`

## Tasks

### Task 1: Create the group

Create a group named `devops`.

### Task 2: Create the user

Create a user named `examuser` with:

- a home directory at `/home/examuser`
- `/bin/bash` as the login shell

### Task 3: Add the user to the group

Add `examuser` to the `devops` group as a supplementary group. `examuser` keeps its own primary group.

### Task 4: Create the project directory

Create the directory `/srv/devops-project` and configure it so that:

- the owner is `examuser` and the group is `devops`
- the owner and the group can read, write and enter the directory
- everyone else has no access at all
- new files created inside it automatically belong to the `devops` group (the setgid bit)

In octal notation, the required mode is `2770`.

## Notes

- All of these commands need `sudo`.
- The checker verifies the result by actually creating a file as `examuser` and by checking that other users are kept out.

## Expected outcome

`examuser` exists, is a member of `devops`, and `/srv/devops-project` is owned by `examuser:devops` with mode `2770`.
