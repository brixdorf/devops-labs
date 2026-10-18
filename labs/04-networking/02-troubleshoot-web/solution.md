Which service has which problem changes in every session, so test them all:

```bash
for s in storefront payments inventory shipping; do
  echo "== $s"
  ping -c 2 -W 2 "$s" >/dev/null && echo "ping ok" || echo "no ping reply"
  curl -s -o /dev/null --max-time 5 -w 'http %{http_code}\n' "http://$s:8080/" || echo "curl failed (exit $?)"
done
sudo ss -tlnp | grep python3
```

Interpretation:

- no ping reply: `unreachable`
- ping replies but curl exits with code 7 (connection refused): `closed-port`
- curl returns 503: `http-error`, and `http_error_code=503`
- curl returns 200: `ok`

Example (your services will differ):

```bash
cat > /home/user/diagnosis.txt <<'END'
storefront=ok
payments=unreachable
inventory=closed-port
shipping=http-error
http_error_code=503
local_port=8081
END
```
