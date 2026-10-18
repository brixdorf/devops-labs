## Scenario

Before writing any Terraform, the team needs a network design for a two-tier web application in AWS:

- a public **load balancer** that receives HTTPS traffic from the internet
- **application servers** that must not be reachable from the internet directly, but need outbound internet access for updates
- administrators connect with SSH only from the company's admin network `198.51.100.0/24`

Instead of drawing the diagram, you will write it as a structured design file that can be checked automatically, and describe how traffic flows through it.

## Tasks

### Task 1: Write the design

Create `/home/user/cloud/design.yaml` with this structure (fill in the values marked `<...>`):

```yaml
vpc:
  cidr: <a /16 range from a private address space>
subnets:
  public:
    cidr: <a /24 inside the VPC>
    route_table: public
  private:
    cidr: <a different /24 inside the VPC>
    route_table: private
nat_gateway_subnet: <public or private>
route_tables:
  public:
    - destination: 0.0.0.0/0
      target: <internet_gateway or nat_gateway>
  private:
    - destination: 0.0.0.0/0
      target: <internet_gateway or nat_gateway>
security_groups:
  web:
    ingress:
      - {port: <port>, source: <CIDR or security group name>}
  app:
    ingress:
      - {port: <port>, source: <CIDR or security group name>}
```

The design must follow these rules:

1. The VPC uses a /16 from one of the private ranges `10.0.0.0/8`, `172.16.0.0/12` or `192.168.0.0/16`, and both subnets are /24 ranges inside it that do not overlap.
2. Only the public subnet routes directly to the internet gateway. The private subnet reaches the internet through a NAT gateway, which must sit in the public subnet.
3. The `web` group (load balancer) accepts HTTPS (443) from anywhere (`0.0.0.0/0`).
4. The `app` group accepts the application port `8080` **only** from the `web` group, and SSH (22) **only** from `198.51.100.0/24`. Nothing in the `app` group is open to `0.0.0.0/0`.

### Task 2: Describe the traffic flow

`/home/user/cloud/hops.txt` lists network hops with IDs. Create `/home/user/cloud/flow.txt` with two lines, each a comma separated list of hop IDs in order:

```
inbound=<hops of a customer request, from the customer to the application server>
outbound=<hops of an update download, from the application server to the internet>
```

## Notes

- Use `python3 -c 'import yaml; print(yaml.safe_load(open("/home/user/cloud/design.yaml")))'` to check that your YAML parses.

## Expected outcome

A design file that satisfies every rule, and the correct inbound and outbound traffic paths.
