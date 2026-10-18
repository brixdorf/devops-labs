#!/bin/bash
set -euo pipefail
cd /home/user/charts
helm create webapp >/dev/null
sed -i 's/^description:.*/description: A simple web application/; s/^version:.*/version: 0.2.0/; s/^appVersion:.*/appVersion: "1.0.0"/' webapp/Chart.yaml
repo=${IMAGE_NGINX%:*}
tag=${IMAGE_NGINX##*:}
python3 - "$repo" "$tag" <<'PY'
import re, sys
p = "webapp/values.yaml"
s = open(p).read()
s = re.sub(r"^replicaCount:.*$", "replicaCount: 2", s, flags=re.M)
s = re.sub(r"^(\s+repository:).*$", r"\1 " + sys.argv[1], s, count=1, flags=re.M)
s = re.sub(r'^(\s+tag:).*$', r'\1 "' + sys.argv[2] + '"', s, count=1, flags=re.M)
open(p, "w").write(s)
PY
helm lint ./webapp >/dev/null
helm template webapp ./webapp > webapp-rendered.yaml
c() { grep -E "$1" parts.txt | cut -d: -f1; }
printf 'Chart.yaml=%s\nvalues.yaml=%s\ntemplates=%s\n' "$(c 'Metadata')" "$(c 'Default configuration')" "$(c 'placeholders')" > purpose.txt
