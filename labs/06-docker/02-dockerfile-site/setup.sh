#!/bin/bash
set -euo pipefail
token="launch-$(openssl rand -hex 4 2>/dev/null || echo $RANDOM$RANDOM)"
mkdir -p /home/user/site
cat > /home/user/site/index.html <<END
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Spring Launch</title></head>
<body>
  <h1>Spring product launch</h1>
  <p>Campaign code: $token</p>
</body>
</html>
END
chown -R user:user /home/user/site
docker pull -q "$IMAGE_PYTHON" >/dev/null 2>&1 || true
printf '{"token": "%s"}\n' "$token" > "$LAB_CONTEXT_FILE"
