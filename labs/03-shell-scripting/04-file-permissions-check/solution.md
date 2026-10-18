```bash
cat > /home/user/scripts/filecheck.sh <<'END'
#!/bin/bash
# Reports whether a file exists and whether the current user can read,
# write and execute it.

if [ "$#" -ne 1 ]; then
  echo "Usage: filecheck.sh <file>" >&2
  exit 2
fi

file=$1
if [ ! -e "$file" ]; then
  echo "exists: no"
  exit 1
fi

yesno() {
  if test "$1" "$file"; then echo yes; else echo no; fi
}

echo "exists: yes"
echo "readable: $(yesno -r)"
echo "writable: $(yesno -w)"
echo "executable: $(yesno -x)"
END
chmod +x /home/user/scripts/filecheck.sh
/home/user/scripts/filecheck.sh /etc/passwd
```
