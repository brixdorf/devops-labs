1. `cd /home/user/website`, make sure you are on `main` (`git branch`).
2. Run `git merge feature/new-title` and read the conflict message.
3. Open `index.html` with `nano`, replace the whole conflict block (from `<<<<<<<` to `>>>>>>>`) with the single combined title line.
4. `git add index.html` and `git commit --no-edit` (or `git commit` and save the prepared message).
5. Check with `git log --oneline --graph --all`, then save it to `/home/user/merge-history.txt`.
