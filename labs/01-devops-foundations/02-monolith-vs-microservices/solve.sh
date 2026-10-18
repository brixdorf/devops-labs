#!/bin/bash
set -euo pipefail
cd /home/user/architecture
pick() { grep -E "$1" statements.txt | head -n2 | cut -d: -f1; }
pick 'deployed on its own|scaled without|isolated' > benefits.txt
pick 'over the network|Tracing one|consistent' > challenges.txt
: > traits-answer.txt
while IFS= read -r line; do
  id=${line%%:*}
  case "$line" in
    *"One deployable"*|*"crash the whole"*|*"share one database"*) kind=monolith ;;
    *) kind=microservices ;;
  esac
  echo "$id=$kind" >> traits-answer.txt
done < traits.txt
