```bash
mkdir -p /home/user/cloud
cat > /home/user/cloud/design.yaml <<'END'
vpc:
  cidr: 10.20.0.0/16
subnets:
  public:
    cidr: 10.20.1.0/24
    route_table: public
  private:
    cidr: 10.20.2.0/24
    route_table: private
nat_gateway_subnet: public
route_tables:
  public:
    - destination: 0.0.0.0/0
      target: internet_gateway
  private:
    - destination: 0.0.0.0/0
      target: nat_gateway
security_groups:
  web:
    ingress:
      - {port: 443, source: 0.0.0.0/0}
  app:
    ingress:
      - {port: 8080, source: web}
      - {port: 22, source: 198.51.100.0/24}
END
```

Traffic flow (match the hop texts in your `hops.txt`):

- inbound: customer on the internet, internet gateway, load balancer in the public subnet, application server in the private subnet
- outbound: application server in the private subnet, private route table, NAT gateway in the public subnet, internet gateway, update server on the internet
