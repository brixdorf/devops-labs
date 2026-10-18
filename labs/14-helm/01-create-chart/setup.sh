#!/bin/bash
set -euo pipefail
dir=/home/user/charts
rm -rf "$dir" && mkdir -p "$dir"
parts=(
  "Chart.yaml|Metadata about the chart, such as its name, version and app version."
  "values.yaml|Default configuration values that the templates read and that users can override."
  "templates|Kubernetes manifests with placeholders that Helm fills in from the values."
  "none|Compiled binaries that Helm runs inside the cluster."
  "none|The record of every release installed in the cluster."
)
json="{" n=1
: > "$dir/parts.txt"
for i in $(printf '%s\n' "${!parts[@]}" | shuf); do
  echo "D$n: ${parts[$i]#*|}" >> "$dir/parts.txt"
  key=${parts[$i]%%|*}
  [ "$key" != none ] && json+="\"$key\": \"D$n\", "
  n=$((n + 1))
done
chown -R user:user "$dir"
printf '%s}\n' "${json%, }" > "$LAB_CONTEXT_FILE"
