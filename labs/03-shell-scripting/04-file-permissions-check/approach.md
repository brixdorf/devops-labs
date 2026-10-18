1. Check the number of arguments with `$#` and print the usage line to standard error with `exit 2` when it is not 1.
2. If `[ ! -e "$1" ]`, print `exists: no` and `exit 1`.
3. Otherwise print the four lines, using `[ -r ]`, `[ -w ]` and `[ -x ]` for the last three.
4. Test it on `/etc/passwd`, on `/etc/shadow`, on your own script and on a missing file.
