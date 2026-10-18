1. Pick a VPC range and two subnets, and check them with Python's `ipaddress` module if you like.
2. Point the public route table at the internet gateway, the private one at the NAT gateway, and place the NAT gateway in the public subnet.
3. Write the security group rules: 443 from 0.0.0.0/0 for web; 8080 from web and 22 from the admin network for app.
4. Read `hops.txt` and order the hops for each direction.
