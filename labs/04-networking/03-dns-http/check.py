from labcheck import Checker, context, ensure, lines, quote, run

ctx = context()
DNS = ctx.get("dns", "")
c = Checker()


def dig(name, rtype="A"):
    return [l.rstrip(".") for l in run(["dig", "+short", f"@{DNS}", name, rtype]).out.split()]


def status(*args):
    return run(["curl", "-s", "-o", "/dev/null", "--max-time", "10", "-w", "%{http_code}", *args]).out.strip()


def report():
    out = {}
    for line in lines("/home/user/dns-report.txt", "the file /home/user/dns-report.txt"):
        if "=" in line:
            k, v = line.split("=", 1)
            out[k.strip()] = v.strip().rstrip(".")
    return out


EXPECTED = {
    "shop_ip": lambda: dig("shop.devops.lab")[-1],
    "www_cname": lambda: dig("www.devops.lab", "CNAME")[0],
    "secure_ip": lambda: dig("secure.devops.lab")[-1],
    "dns_server": lambda: DNS,
    "shop_status": lambda: status("http://shop.devops.lab/"),
    "shop_old_catalog_status": lambda: status("http://shop.devops.lab/old-catalog"),
    "secure_https_status": lambda: status("-k", "https://secure.devops.lab/"),
    "secure_http_status": lambda: status("http://secure.devops.lab/"),
}

for key, fn in EXPECTED.items():

    @c.test(f"dns-report.txt has the correct {key}")
    def _(key=key, fn=fn):
        got = report().get(key)
        ensure(got is not None, f"Expected a line '{key}=...' in dns-report.txt")
        want = fn()
        ensure(got == want, f"Expected {quote(want)} but found {quote(got)}")
        return f"{key} is {want}"


c.run()
