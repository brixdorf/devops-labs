#!/bin/bash
set -euo pipefail
cd /home/user
echo "$(pwd)" >> /home/user/answer.txt
cd task_1
echo cd >> /home/user/answer.txt
ls >/dev/null
echo ls >> /home/user/answer.txt
hidden=$(ls -A | grep '^\.' | head -n1)
echo "$hidden" >> /home/user/answer.txt
