```bash
cat /etc/resolv.conf                     # nameserver <dns server ip>
dig +short shop.devops.lab               # A record
dig www.devops.lab | grep CNAME          # www.devops.lab. ... CNAME shop.devops.lab.
dig +short secure.devops.lab
nslookup shop.devops.lab                 # "Server:" shows the DNS server too

code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
code http://shop.devops.lab/             # 200
code http://shop.devops.lab/old-catalog  # 301
code -k https://secure.devops.lab/       # 200
code http://secure.devops.lab/           # 301
```

Then write the values you got:

```bash
cat > /home/user/dns-report.txt <<END
shop_ip=$(dig +short shop.devops.lab | tail -n1)
www_cname=shop.devops.lab
secure_ip=$(dig +short secure.devops.lab | tail -n1)
dns_server=$(awk '/^nameserver/ {print $2; exit}' /etc/resolv.conf)
shop_status=200
shop_old_catalog_status=301
secure_https_status=200
secure_http_status=301
END
```
