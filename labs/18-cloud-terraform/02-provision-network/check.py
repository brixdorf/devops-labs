import os
import re

from labcheck import Checker, ensure, quote, read, run
from moto import lab_instances, recorded_calls

D = "/home/user/cloud/network"
c = Checker()


def tf(*args):
    return run(["terraform", f"-chdir={D}", *args], user="user", timeout=120)


@c.test("main.tf declares the network, the instance and the output")
def _():
    text = read(f"{D}/main.tf")
    for kind, name in [("aws_vpc", "main"), ("aws_subnet", "public"), ("aws_internet_gateway", "main"), ("aws_route_table", "public"), ("aws_route_table_association", "public"), ("aws_instance", "web")]:
        ensure(re.search(rf'resource\s+"{kind}"\s+"{name}"', text), f"Expected resource {kind}.{name}")
    ensure(re.search(r'data\s+"aws_ami"', text), 'Expected a data "aws_ami" lookup')
    ensure("al2023-ami-" in text and '"amazon"' in text, "Expected the AMI lookup to use owner amazon and the al2023-ami-* name")
    ensure('"t3.micro"' in text, "Expected instance_type t3.micro")
    ensure("10.30.0.0/16" in text and "10.30.1.0/24" in text, "Expected the VPC 10.30.0.0/16 and the subnet 10.30.1.0/24")
    ensure(re.search(r'output\s+"instance_id"', text), 'Expected an output "instance_id"')
    ensure(not re.search(r"(access_key|secret_key)\s*=", text), "Expected no access keys in the configuration")
    return "All resources, the AMI lookup and the output are declared"


@c.test("a plan was saved and reviewed before applying")
def _():
    ensure(os.path.isfile(f"{D}/tfplan"), "Expected the saved plan tfplan")
    text = read(f"{D}/plan.txt")
    m = re.search(r"Plan: (\d+) to add", text)
    ensure(m and int(m.group(1)) == 6, f"Expected plan.txt to show 'Plan: 6 to add' but found {quote(m.group(0) if m else 'no plan summary')}")
    ensure("aws_instance.web" in text, "Expected aws_instance.web in the plan")
    return "plan.txt shows 6 resources to add"


@c.test("the resources were created in the sandbox account")
def _():
    calls = recorded_calls()
    for action in ["CreateVpc", "CreateSubnet", "CreateInternetGateway", "CreateRouteTable", "RunInstances"]:
        ensure(action in calls, f"Expected Terraform to call {action}. Apply the saved plan.")
    insts = lab_instances()
    ensure(insts, "Expected an instance tagged Project=devops-labs")
    ensure(insts[-1].get("instance_type") == "t3.micro", f"Expected a t3.micro instance but found {insts[-1].get('instance_type')}")
    want = read(f"{D}/instance-id.txt").strip()
    ensure(any(i["id"] == want for i in insts), f"Expected instance-id.txt to hold the created instance ID but found {quote(want)}")
    return f"{want} was created with its network"


@c.test("everything was destroyed afterwards", requires=["the resources were created in the sandbox account"])
def _():
    calls = recorded_calls()
    for action in ["TerminateInstances", "DeleteSubnet", "DeleteVpc", "DeleteInternetGateway"]:
        ensure(action in calls, f"Expected Terraform to call {action}. Run terraform destroy.")
    running = [i["id"] for i in lab_instances() if i.get("state") != "terminated"]
    ensure(not running, f"Expected no running lab instances but {running[0] if running else ''} is still running")
    ensure(not tf("state", "list").out.strip(), "Expected an empty Terraform state after the destroy")
    ensure("Destroy complete! Resources: 6 destroyed." in read(f"{D}/destroy.txt"), "Expected destroy.txt to show 'Destroy complete! Resources: 6 destroyed.'")
    return "All 6 resources were destroyed"


c.run()
