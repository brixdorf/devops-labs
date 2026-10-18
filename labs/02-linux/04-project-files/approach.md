1. Explore `incoming` with `ls -R` or `tree`.
2. Create the layout with one `mkdir -p` command.
3. Use `cp` for `app.py` and `mv` for `settings.conf`.
4. Use `find` to locate and move every `.log` file, then check that none are left in `incoming`.
5. Use `grep -rl` on the logs folder to find the file with `disk full`, and write its name with `basename ... > search-result.txt`.
6. Use `find` with `-delete` for the `.tmp` files.
7. Redirect `ls -l` of the logs folder into `listing.txt`.
