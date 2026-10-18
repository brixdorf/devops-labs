#!/bin/bash
set -euo pipefail
rm -rf /home/user/website /home/user/merge-history.txt
runuser -u user -- bash -s <<'END'
set -e
git config --global user.name "Lab Student"
git config --global user.email "student@example.com"
git init -q -b main /home/user/website
cd /home/user/website
cat > index.html <<'HTML'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Shop</title>
</head>
<body>
  <h1>Our products</h1>
  <p>Fresh coffee, tea and snacks.</p>
</body>
</html>
HTML
git add index.html && git commit -q -m "Add home page"
git switch -q -c feature/new-title
sed -i 's|<title>Shop</title>|<title>Welcome Home</title>|' index.html
git commit -q -am "Use a friendlier page title"
git switch -q main
sed -i 's|<title>Shop</title>|<title>Northwind Shop</title>|' index.html
git commit -q -am "Put the brand name in the title"
END
main=$(runuser -u user -- git -C /home/user/website rev-parse main)
feature=$(runuser -u user -- git -C /home/user/website rev-parse feature/new-title)
printf '{"main": "%s", "feature": "%s"}\n' "$main" "$feature" > "$LAB_CONTEXT_FILE"
