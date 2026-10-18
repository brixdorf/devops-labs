1. Start with `#!/bin/bash`.
2. Check `$#`: if it is not 1, print the usage line to standard error and `exit 1`.
3. Check that `"$1"` is a directory: if not, print the error line to standard error and `exit 2`.
4. Count files and directories with `find -mindepth 1 -maxdepth 1` and `-type f` / `-type d`, then `wc -l`.
5. Print the two lines with `echo "Files: $files"` and `echo "Directories: $dirs"`.
6. Test it on your home directory, an empty directory, a file and with no argument. Check exit codes with `echo $?`.
