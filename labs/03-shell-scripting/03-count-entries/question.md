## Objective

Write a script that reports how many files and subdirectories a directory contains, and that handles bad input politely. Scripts like this are the building blocks of cleanup and audit jobs.

## Tasks

Create the script `/home/user/scripts/count.sh`. It takes exactly one argument, a directory path:

```
bash /home/user/scripts/count.sh /some/directory
```

### Task 1: Count the entries

For a valid directory, print exactly two lines to standard output and exit with status `0`:

```
Files: <number of regular files>
Directories: <number of subdirectories>
```

Count only the entries **directly inside** the directory (do not count recursively), and **include hidden** entries (names that start with a dot). Do not count the special entries `.` and `..`.

### Task 2: Handle a missing argument

When the script is run with no argument, or with more than one argument, print this line to standard error and exit with status `1`:

```
Usage: count.sh <directory>
```

### Task 3: Handle an invalid directory

When the argument does not exist or is not a directory, print this line to standard error and exit with status `2` (with the argument in place of `<path>`):

```
Error: <path> is not a directory
```

## Notes

- The checker runs your script with `bash` as the user `user`, against several directories, including an empty one and one with names that contain spaces.
- Make the script executable too, so it can also be run as `./count.sh`.

## Expected outcome

`count.sh` prints correct counts for any directory and fails with the exact messages and exit codes for bad input.
