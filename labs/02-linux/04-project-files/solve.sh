#!/bin/bash
set -euo pipefail
cd /home/user
mkdir -p project/{app,logs,config}
cp incoming/app.py project/app/
mv incoming/settings.conf project/config/
find incoming -type f -name '*.log' -exec mv {} project/logs/ \;
basename "$(grep -rl 'disk full' project/logs)" > project/search-result.txt
find incoming -type f -name '*.tmp' -delete
ls -l project/logs > project/listing.txt
