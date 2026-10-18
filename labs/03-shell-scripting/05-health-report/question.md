## Objective

Operations teams run small health scripts on every server. Write a reusable one that uses **variables, conditions, loops and functions**, reports uptime, memory and disk usage, and turns the result into a simple OK or WARNING status that other tools can act on.

## Tasks

Create the script `/home/user/scripts/health.sh`. It takes one optional argument, a usage threshold in percent (default `80`):

```
bash /home/user/scripts/health.sh        # threshold 80
bash /home/user/scripts/health.sh 90     # threshold 90
```

### Task 1: Structure

The script must:

- store the threshold in a variable named `THRESHOLD` (from the first argument, or `80` when there is none),
- store the paths to check in a variable named `PATHS_TO_CHECK` with the value `"/ /var /tmp"`,
- define three functions named `show_uptime`, `check_memory` and `check_disk`, and call them,
- use a loop in `check_disk` to check every path in `PATHS_TO_CHECK`,
- use `if` conditions to decide the status.

### Task 2: Output

Print exactly this format (one line per path, in the order of `PATHS_TO_CHECK`):

```
System Health Report
Uptime: up 2 hours, 5 minutes
Memory: 41% used
Disk /: 63% used
Disk /var: 63% used
Disk /tmp: 63% used
Status: OK
```

- `Uptime:` is followed by the output of `uptime -p`.
- `Memory:` is the percentage of memory in use, calculated as `(total - available) * 100 / total` from `free` (or `/proc/meminfo`), rounded down to a whole number.
- `Disk <path>:` is the use percentage that `df` reports for that path.

### Task 3: Status and exit code

- If the memory percentage **or** any disk percentage is greater than or equal to `THRESHOLD`, print `Status: WARNING` and exit with status `1`.
- Otherwise print `Status: OK` and exit with status `0`.

### Task 4: Validate the threshold

If the threshold is not a whole number from 1 to 100, print this line to standard error and exit with status `2`:

```
Error: threshold must be a number between 1 and 100
```

## Notes

- The checker compares your numbers with values it measures itself, allowing a small difference because memory use changes between two measurements.
- The checker runs the script with different thresholds to test both statuses.

## Expected outcome

`health.sh` prints a correct report and exits with 0, 1 or 2 depending on the measurements and the threshold.
