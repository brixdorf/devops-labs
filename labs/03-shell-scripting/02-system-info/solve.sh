#!/bin/bash
set -euo pipefail
cd ~
touch system_info.sh
chmod +x system_info.sh
cat > system_info.sh <<'END'
#!/bin/bash
# Author: Lab Self-Test
# Version: 1.0
# Description: Prints a system information report header.
echo "System Information Report"
END
