import ipaddress

from labcheck import Checker, ensure, lines, quote, read
from moto import ec2_data

D = "/home/user/cloud/firewall"
c = Checker()


def group():
    for sg in ec2_data().get("SecurityGroup", []):
        if sg.get("name") == "web-sg" or sg.get("group_name") == "web-sg":
            return sg
    return None


def ingress(sg):
    """Ingress rules of a group as (protocol, from_port, to_port, [cidrs])."""
    rules = []
    for r in ec2_data().get("SecurityGroupRule", []):
        if r.get("group_id") != sg.get("id") or r.get("is_egress"):
            continue
        cidrs = [x for x in (r.get("cidr_ipv4"), r.get("cidr_ipv6")) if x]
        rules.append((str(r.get("ip_protocol")), r.get("from_port"), r.get("to_port"), cidrs))
    return rules


@c.test("web-sg exists in the sandbox account")
def _():
    sg = group()
    ensure(sg, "Expected a security group named web-sg in Moto. Apply the configuration.")
    vpcs = {v.get("id"): v.get("cidr_block") for v in ec2_data().get("VPC", [])}
    ensure(vpcs.get(sg.get("vpc_id")) == "10.40.0.0/16", "Expected web-sg in the VPC 10.40.0.0/16")
    tags = {t.get("key"): t.get("value") for t in sg.get("tag_set") or []}
    ensure(tags.get("Project") == "devops-labs", "Expected the tag Project = devops-labs on web-sg")
    return f"{sg.get('id')} is in the 10.40.0.0/16 VPC"


@c.test("HTTPS is open to the internet", requires=["web-sg exists in the sandbox account"])
def _():
    ok = any(p in ("tcp", "6") and lo == 443 and hi == 443 and "0.0.0.0/0" in cidrs for p, lo, hi, cidrs in ingress(group()))
    ensure(ok, "Expected an ingress rule for TCP 443 from 0.0.0.0/0")
    return "443/tcp from 0.0.0.0/0"


@c.test("SSH is allowed only from the admin network", requires=["web-sg exists in the sandbox account"])
def _():
    admin = ipaddress.ip_network("198.51.100.0/24")
    ssh = []
    for p, lo, hi, cidrs in ingress(group()):
        covers_ssh = p in ("-1", "all") or (lo is not None and hi is not None and int(lo) <= 22 <= int(hi))
        if covers_ssh:
            ssh += cidrs
    ensure(ssh, "Expected an SSH rule for the admin network")
    for cidr in ssh:
        n = ipaddress.ip_network(cidr, strict=False)
        ensure(n.version == 4 and n.subnet_of(admin), f"Expected SSH only from 198.51.100.0/24 but it is also open to {cidr}")
    return "22/tcp only from 198.51.100.0/24"


@c.test("no other ports are open", requires=["web-sg exists in the sandbox account"])
def _():
    extra = [(lo, hi) for p, lo, hi, cidrs in ingress(group()) if (lo, hi) not in ((443, 443), (22, 22))]
    ensure(not extra, f"Expected only ports 443 and 22 but also found {extra}")
    return "Only 443 and 22 have rules"


@c.test("the audit files describe the exposure")
def _():
    audit = read(f"{D}/sg-audit.txt")
    ensure("web-sg" in audit and "198.51.100.0/24" in audit, "Expected the output of terraform state show aws_security_group.web in sg-audit.txt")
    got = {}
    for line in lines(f"{D}/exposure.txt", f"the file {D}/exposure.txt"):
        if "=" in line:
            k, v = line.split("=", 1)
            got[k.strip()] = v.strip()
    ensure(got.get("internet_ports") == "443", f"Expected internet_ports=443 but found {quote(got.get('internet_ports', ''))}")
    ensure(got.get("ssh_source") == "198.51.100.0/24", f"Expected ssh_source=198.51.100.0/24 but found {quote(got.get('ssh_source', ''))}")
    return "Only 443 is exposed to the internet"


c.run()
