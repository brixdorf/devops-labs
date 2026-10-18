1. Set `THRESHOLD=${1:-80}` and validate it: a number, at least 1 and at most 100. Otherwise print the error to standard error and `exit 2`.
2. Set `PATHS_TO_CHECK="/ /var /tmp"` and `STATUS=OK`.
3. Write `show_uptime` to print `Uptime: $(uptime -p)`.
4. Write `check_memory` to compute the percentage, print it, and set `STATUS=WARNING` when it reaches the threshold.
5. Write `check_disk` with a `for` loop over `$PATHS_TO_CHECK` that does the same for each path.
6. Print the title, call the three functions, print the status, and exit with `0` or `1`.
7. Test with thresholds `100`, `1`, `abc` and `0`, checking `echo $?` each time.
