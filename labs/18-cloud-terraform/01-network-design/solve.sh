#!/bin/bash
set -euo pipefail
cd /home/user/cloud
cat > design.yaml <<'END'
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
h() { grep -F "$1" hops.txt | cut -d: -f1; }
printf 'inbound=%s,%s,%s,%s\noutbound=%s,%s,%s,%s,%s\n' \
  "$(h "Customer")" "$(h "Internet gateway")" "$(h "Load balancer")" "$(h "Application server")" \
  "$(h "Application server")" "$(h "Route table of the private")" "$(h "NAT gateway in")" "$(h "Internet gateway")" "$(h "Update server")" > flow.txt
