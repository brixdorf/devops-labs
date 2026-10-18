#!/bin/bash
set -euo pipefail
dir=/home/user/hpa
rm -rf "$dir" && mkdir -p "$dir"
statements=(
  "yes|The metrics-server (the resource metrics API) must be running, because the HPA reads CPU usage from it."
  "yes|The containers must define CPU requests, because CPU utilization is calculated as a percentage of the request."
  "no|The Deployment must use the NodePort Service type."
  "no|The cluster must have at least as many nodes as the maximum replica count."
  "no|An Ingress must route traffic to the Deployment."
  "no|The image must be pulled with imagePullPolicy Always."
)
json='"yes": [' n=1
: > "$dir/statements.txt"
for i in $(printf '%s\n' "${!statements[@]}" | shuf); do
  echo "P$n: ${statements[$i]#*|}" >> "$dir/statements.txt"
  [ "${statements[$i]%%|*}" = yes ] && json+="\"P$n\", "
  n=$((n + 1))
done
chown -R user:user "$dir"
printf '{%s]}\n' "${json%, }" > "$LAB_CONTEXT_FILE"
