```bash
cd /home/user/todo-app
git init -b main
git config user.name "Student"
git config user.email "student@example.com"

git add todo.py
git commit -m "Add to-do list module"
git add test_todo.py
git commit -m "Add tests for the to-do list"
printf '# Todo App\n\nA tiny command line to-do list written in Python.\n' > README.md
git add README.md
git commit -m "Add README with usage notes"
```

Create the empty repository `todo-app` in Gitea ({{GITEA_URL}}, **+** then **New Repository**), then:

```bash
git remote add origin {{GITEA_URL}}/{{GITEA_USER}}/todo-app.git
git push -u origin main        # username {{GITEA_USER}}, password {{GITEA_PASSWORD}}
```
