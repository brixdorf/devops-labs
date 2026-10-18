import ipaddress

import yaml
from labcheck import Checker, context, ensure, lines, quote, read

ctx = context()
c = Checker()
PRIVATE = [ipaddress.ip_network(n) for n in ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]]
ADMIN = ipaddress.ip_network("198.51.100.0/24")


def design():
    try:
        data = yaml.safe_load(read("/home/user/cloud/design.yaml"))
    except yaml.YAMLError as exc:
        ensure(False, f"Expected valid YAML in design.yaml: {str(exc).splitlines()[0]}")
    ensure(isinstance(data, dict), "Expected design.yaml to be a mapping")
    return data


def net(value, what):
    try:
        return ipaddress.ip_network(str(value), strict=True)
    except ValueError:
        ensure(False, f"Expected {what} to be a network in CIDR form but found {quote(value)}")


@c.test("the VPC and subnets use valid, non-overlapping private ranges")
def _():
    d = design()
    vpc = net((d.get("vpc") or {}).get("cidr"), "vpc.cidr")
    ensure(vpc.prefixlen == 16, f"Expected the VPC to be a /16 but it is a /{vpc.prefixlen}")
    ensure(any(vpc.subnet_of(p) for p in PRIVATE), f"Expected the VPC in a private range but found {vpc}")
    subs = d.get("subnets") or {}
    nets = {}
    for name in ["public", "private"]:
        ensure(name in subs, f"Expected a {name} subnet")
        n = net(subs[name].get("cidr"), f"subnets.{name}.cidr")
        ensure(n.prefixlen == 24, f"Expected the {name} subnet to be a /24 but it is a /{n.prefixlen}")
        ensure(n.subnet_of(vpc), f"Expected the {name} subnet {n} to be inside the VPC {vpc}")
        nets[name] = n
    ensure(not nets["public"].overlaps(nets["private"]), "Expected the two subnets not to overlap")
    return f"VPC {vpc}, public {nets['public']}, private {nets['private']}"


@c.test("routing makes only the public subnet public")
def _():
    d = design()
    subs = d.get("subnets") or {}
    tables = d.get("route_tables") or {}
    def default_target(sub):
        rt = tables.get((subs.get(sub) or {}).get("route_table"), [])
        ensure(isinstance(rt, list) and rt, f"Expected a route table with routes for the {sub} subnet")
        for r in rt:
            if str(r.get("destination")) == "0.0.0.0/0":
                return r.get("target")
        return None
    ensure(default_target("public") == "internet_gateway", "Expected the public subnet's 0.0.0.0/0 route to target the internet_gateway")
    ensure(default_target("private") == "nat_gateway", "Expected the private subnet's 0.0.0.0/0 route to target the nat_gateway")
    ensure(d.get("nat_gateway_subnet") == "public", "Expected the NAT gateway in the public subnet, where it can reach the internet gateway")
    return "public -> internet gateway, private -> NAT in the public subnet"


def rules(d, group):
    sg = (d.get("security_groups") or {}).get(group) or {}
    found = []
    for r in sg.get("ingress") or []:
        found.append((int(r.get("port")), str(r.get("source"))))
    return found


@c.test("the web group accepts HTTPS from the internet")
def _():
    ensure((443, "0.0.0.0/0") in rules(design(), "web"), "Expected the web group to allow port 443 from 0.0.0.0/0")
    return "web: 443 from 0.0.0.0/0"


@c.test("the app group is reachable only from web and the admin network")
def _():
    r = rules(design(), "app")
    ensure((8080, "web") in r, "Expected the app group to allow port 8080 from the web group")
    ssh = [s for p, s in r if p == 22]
    ensure(ssh, "Expected an SSH rule for the admin network")
    for p, s in r:
        if s in ("web",):
            continue
        n = net(s, "an app ingress source")
        ensure(n.subnet_of(ADMIN), f"Expected nothing in the app group open beyond the admin network, but port {p} allows {n}")
        ensure(p == 22, f"Expected the admin network to reach only SSH, but port {p} is open to it")
    return "app: 8080 from web, 22 from 198.51.100.0/24 only"


@c.test("flow.txt lists the inbound and outbound paths")
def _():
    got = {}
    for line in lines("/home/user/cloud/flow.txt", "the file /home/user/cloud/flow.txt"):
        if "=" in line:
            k, v = line.split("=", 1)
            got[k.strip()] = [x.strip().upper() for x in v.split(",") if x.strip()]
    for k in ["inbound", "outbound"]:
        ensure(k in got, f"Expected a line '{k}=...' in flow.txt")
        ensure(got[k] == ctx[k], f"The {k} path {','.join(got[k])} is not right. Follow a packet hop by hop.")
    return "Both traffic paths are correct"


c.run()
