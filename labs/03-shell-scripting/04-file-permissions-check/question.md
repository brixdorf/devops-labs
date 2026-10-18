## Objective

Deployment scripts often fail because a file is missing or has the wrong permissions. Write a script that checks a file and reports, in a clear and predictable format, whether the current user can read, write and execute it.

## Tasks

Create the script `/home/user/scripts/filecheck.sh`. It takes exactly one argument, a path:

```
bash /home/user/scripts/filecheck.sh /path/to/file
```

### Task 1: Report each check

When the file exists, print exactly these four lines and exit with status `0`, with `yes` or `no` for each check, as seen by the user who runs the script:

```
exists: yes
readable: yes
writable: no
executable: no
```

### Task 2: A missing file

When the path does not exist, print exactly this one line and exit with status `1`:

```
exists: no
```

### Task 3: A missing argument

When the script is run with no argument or more than one argument, print this line to standard error and exit with status `2`:

```
Usage: filecheck.sh <file>
```

## Notes

- The checker runs your script as `user` against files with different owners and permission modes, including a path with spaces.
- Remember that permissions depend on who runs the script: `root` can read almost anything, but `user` cannot.

## Expected outcome

`filecheck.sh` reports exists, readable, writable and executable correctly for any file, and handles missing files and arguments with the exact messages and exit codes.
