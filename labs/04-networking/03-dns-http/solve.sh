#!/bin/bash
set -euo pipefail
code() { curl -s -o /dev/null --max-time 10 -w '%{http_code}' "$@"; }
cat > /home/user/dns-report.txt <<END
shop_ip=$(dig +short shop.devops.lab | tail -n1)
www_cname=$(dig +short www.devops.lab CNAME | sed 's/\.$//')
secure_ip=$(dig +short secure.devops.lab | tail -n1)
dns_server=$(awk '/^nameserver/ {print $2; exit}' /etc/resolv.conf)
shop_status=$(code http://shop.devops.lab/)
shop_old_catalog_status=$(code http://shop.devops.lab/old-catalog)
secure_https_status=$(code -k https://secure.devops.lab/)
secure_http_status=$(code http://secure.devops.lab/)
END
