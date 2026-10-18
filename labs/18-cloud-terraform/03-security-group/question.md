## Objective

Many cloud breaches start with a security group that is open to the whole internet on SSH or an admin port. A good firewall rule set opens **only** what the application needs to the public, and keeps admin access to a known network. You will write such a security group with Terraform in the sandbox account (Moto) and prove that SSH is not open to the internet.

The terminal is configured for Moto, as in the previous lab.

## Tasks

Work in `/home/user/cloud/firewall` (create it).

### Task 1: Write the configuration

With the `hashicorp/aws` provider in `us-east-1`, create:

- `aws_vpc.app` with CIDR `10.40.0.0/16`
- `aws_security_group.web` named `web-sg` in that VPC, with:
  - ingress TCP `443` from `0.0.0.0/0` (the application, HTTPS)
  - ingress TCP `22` from the admin network `198.51.100.0/24` only
  - egress: all traffic to `0.0.0.0/0`

No other ingress rules. Tag both resources with `Project = "devops-labs"`.

### Task 2: Apply it

Initialize, review the plan and apply. Leave the resources in place.

### Task 3: Audit the result

Save `terraform state show aws_security_group.web` (with `-no-color`) to `/home/user/cloud/firewall/sg-audit.txt`. Then create `/home/user/cloud/firewall/exposure.txt` with:

```
internet_ports=<ports open to 0.0.0.0/0, comma separated>
ssh_source=<the only network allowed to use SSH>
```

## Notes

- `0.0.0.0/0` means "every IPv4 address". Never use it for SSH (22) or RDP (3389).
- The checker reads the security group back from the sandbox account, not only from your files.

## Expected outcome

`web-sg` exists in the sandbox account with HTTPS open to the internet, SSH limited to the admin network, and nothing else.
