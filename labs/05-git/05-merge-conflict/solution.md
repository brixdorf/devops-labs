```bash
cd /home/user/website
git switch main
git merge feature/new-title          # CONFLICT (content): Merge conflict in index.html
nano index.html
```

Replace the conflict block:

```
<<<<<<< HEAD
  <title>Northwind Shop</title>
=======
  <title>Welcome Home</title>
>>>>>>> feature/new-title
```

with:

```
  <title>Northwind Shop | Welcome Home</title>
```

Then:

```bash
git add index.html
git commit --no-edit
git log --oneline --graph --all > /home/user/merge-history.txt
cat /home/user/merge-history.txt
```
