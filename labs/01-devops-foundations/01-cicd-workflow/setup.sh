#!/bin/bash
# Writes the scenario and a shuffled list of activities.
set -euo pipefail
dir=/home/user/cicd
mkdir -p "$dir"
cat > "$dir/scenario.md" <<'END'
# BookNest release process (today)

BookNest is an online bookstore written in Python. Two developers work on it.

How a change reaches customers today:

1. A developer finishes a change on a laptop and pushes it to the Git repository.
2. Someone runs the build by hand on the same laptop and runs a few tests when there is time.
3. The files are copied to the production server with scp.
4. After the release, a developer clicks around the website to see whether it still works.
   Problems are usually reported by customers first.

The team wants every commit to flow automatically through build, test, package and
deploy stages, and wants to monitor the live site so problems are noticed before
customers notice them.
END
activities=(
  "commit|Developer pushes a change to the main branch"
  "build|Install dependencies and compile the source code"
  "test|Run the unit tests"
  "test|Run integration tests against a test database"
  "package|Create a versioned container image and push it to the registry"
  "deploy|Roll the new image out to the production servers"
  "monitor|Watch the error rate and latency dashboards"
  "monitor|Alert the on-call engineer when the site returns errors"
)
mapfile -t order < <(printf '%s\n' "${!activities[@]}" | shuf)
{
  echo "# Activities"
  echo
  echo "Assign each activity to one workflow stage."
  echo
} > "$dir/activities.md"
key="{"
n=1
for i in "${order[@]}"; do
  stage=${activities[$i]%%|*}
  text=${activities[$i]#*|}
  echo "- A$n: $text" >> "$dir/activities.md"
  key+="\"A$n\": \"$stage\", "
  n=$((n + 1))
done
key="${key%, }}"
chown -R user:user "$dir"
printf '{"activities": %s}\n' "$key" > "$LAB_CONTEXT_FILE"
