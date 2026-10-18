#!/bin/bash
set -euo pipefail
dir=/home/user/roadmap
mkdir -p "$dir"
cat > "$dir/team.md" <<'END'
# PixelPost team

- Four developers, one shared network folder for code, no Git.
- No automated tests. Bugs are found by users after a release.
- "It works on my machine": the app only runs with the senior developer's setup.
- Releases are copied to the server by hand on Friday evenings and often fail.
- Nobody notices when the site is down until users complain on social media.
END
cat > "$dir/practices.txt" <<'END'
P1: Version control
P2: Automated tests
P3: Containerization
P4: CI/CD
P5: Monitoring
END
reasons=(
  "P1|Every change is tracked, can be reviewed and can be undone."
  "P2|Bugs are caught on every change, before a release."
  "P3|The app runs the same way on every laptop and server."
  "P4|Releases happen automatically and repeatably, not by hand on Friday evenings."
  "P5|The team learns about outages before users report them."
  "none|The office gets faster internet."
  "none|Developers can choose their own desk."
)
json="{" n=1
: > "$dir/reasons.txt"
for i in $(printf '%s\n' "${!reasons[@]}" | shuf); do
  echo "R$n: ${reasons[$i]#*|}" >> "$dir/reasons.txt"
  p=${reasons[$i]%%|*}
  [ "$p" != none ] && json+="\"$p\": \"R$n\", "
  n=$((n + 1))
done
chown -R user:user "$dir"
printf '{"reasons": %s}\n' "${json%, }}" > "$LAB_CONTEXT_FILE"
