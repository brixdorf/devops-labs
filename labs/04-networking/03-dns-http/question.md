## Objective

The company runs its own DNS server for the internal zone `devops.lab`. Your machine is already configured to use it. You will resolve names with `nslookup` or `dig`, then check whether the websites behind those names answer over HTTP and HTTPS, and record what you find.

## Tasks

### Task 1: Resolve the names

Find out:

- the IPv4 address (A record) of `shop.devops.lab`
- the name that `www.devops.lab` is an alias (CNAME) for
- the IPv4 address of `secure.devops.lab`
- the IP address of the DNS server that answered your queries

### Task 2: Test the websites

Find the HTTP status code that each request returns, **without following redirects**:

- `http://shop.devops.lab/`
- `http://shop.devops.lab/old-catalog`
- `https://secure.devops.lab/` (the site uses a self-signed certificate, so tell curl not to verify it)
- `http://secure.devops.lab/` (plain HTTP)

### Task 3: Record the results

Create `/home/user/dns-report.txt` with exactly these lines:

```
shop_ip=<A record of shop.devops.lab>
www_cname=<target of the CNAME, without a trailing dot>
secure_ip=<A record of secure.devops.lab>
dns_server=<IP address of the DNS server>
shop_status=<status of http://shop.devops.lab/>
shop_old_catalog_status=<status of http://shop.devops.lab/old-catalog>
secure_https_status=<status of https://secure.devops.lab/>
secure_http_status=<status of http://secure.devops.lab/>
```

## Notes

- Skipping certificate verification (`curl -k`) is acceptable here only because this is a local lab service with a self-signed certificate.
- `/etc/resolv.conf` shows which DNS server the machine uses.

## Expected outcome

`dns-report.txt` lists the DNS answers, the DNS server and the four HTTP status codes.
