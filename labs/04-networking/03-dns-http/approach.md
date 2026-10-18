1. Run `cat /etc/resolv.conf` to see the DNS server.
2. Use `dig` or `nslookup` for `shop.devops.lab`, `www.devops.lab` and `secure.devops.lab`.
3. Use `curl -s -o /dev/null -w '%{http_code}\n'` for the four URLs. Add `-k` only for the HTTPS one.
4. Write the eight lines into `dns-report.txt`.
