#!/bin/bash
set -euo pipefail
cd /home/user/cicd
printf '%s\n' commit build test package deploy monitor > pipeline.txt
echo 'commit -> build -> test -> package -> deploy -> monitor' > diagram.txt
: > activities.txt
while IFS= read -r line; do
  id=$(sed -E 's/^- (A[0-9]+): .*/\1/' <<<"$line")
  text=${line#*: }
  case "$text" in
    *pushes*) stage=commit ;;
    *compile*) stage=build ;;
    *"Roll the new"*) stage=deploy ;;
    *tests*) stage=test ;;
    *image*) stage=package ;;
    *dashboards*|*on-call*) stage=monitor ;;
  esac
  echo "$id=$stage" >> activities.txt
done < <(grep '^- A' activities.md)
