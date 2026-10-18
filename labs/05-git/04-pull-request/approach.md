1. `cd /home/user/greeter && git switch -c feature/farewell`
2. Add the `farewell` function to `greeter.py` with `nano`, test it, then `git add` and `git commit`.
3. `git push -u origin feature/farewell`
4. In Gitea open the repository, go to **Pull Requests**, click **New Pull Request**, choose `main` as the base and `feature/farewell` as the branch to merge, and give it a title such as "Add farewell function".
5. Open **Files Changed** and read the diff, then go back to the conversation tab and click **Create merge commit**.
6. Locally run `git switch main` and `git pull`.
