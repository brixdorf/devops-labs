#!/bin/bash
set -euo pipefail
cat > /home/user/scripts/count.sh <<'END'
#!/bin/bash
if [ "$#" -ne 1 ]; then
  echo "Usage: count.sh <directory>" >&2
  exit 1
fi
dir=$1
if [ ! -d "$dir" ]; then
  echo "Error: $dir is not a directory" >&2
  exit 2
fi
files=$(find "$dir" -mindepth 1 -maxdepth 1 -type f | wc -l)
dirs=$(find "$dir" -mindepth 1 -maxdepth 1 -type d | wc -l)
echo "Files: $files"
echo "Directories: $dirs"
END
chmod +x /home/user/scripts/count.sh
