```bash
cd /home/user/greeter
git switch -c feature/farewell
cat >> greeter.py <<'END'


def farewell(name):
    return f"Goodbye, {name}!"
END
python3 -c 'import greeter; print(greeter.farewell("Ada"))'
git add greeter.py
git commit -m "Add farewell function"
git push -u origin feature/farewell
```

In Gitea: **Pull Requests**, **New Pull Request**, base `main`, compare `feature/farewell`, title "Add farewell function", **Create Pull Request**. Review **Files Changed**, then **Create merge commit**.

```bash
git switch main
git pull
git log --oneline --graph -5
```
