#!/bin/bash
# Creates task_1 with a few visible files and one hidden file whose name is
# chosen at random for this session.
set -euo pipefail
names=(.deploy_token .backup_key .cache_index .session_secret .build_manifest .release_notes)
hidden=${names[$((RANDOM % ${#names[@]}))]}
mkdir -p /home/user/task_1
cd /home/user/task_1
touch notes.txt report.csv script.sh
echo "keep this safe" > "$hidden"
chown -R user:user /home/user/task_1
rm -f /home/user/answer.txt
printf '{"hidden": "%s"}\n' "$hidden" > "$LAB_CONTEXT_FILE"
