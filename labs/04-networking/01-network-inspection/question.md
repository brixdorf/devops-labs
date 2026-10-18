## Objective

Before you can troubleshoot a network problem, you need to know how the machine itself is connected: its IP address and subnet, where traffic leaves the subnet, and which services listen for connections. In this lab you collect those facts with standard Linux commands, record the commands, and interpret what you see.

Password for sudo: `user@123!`

## Tasks

### Task 1: Collect the facts

Create `/home/user/network-report.txt` with exactly these five lines, filled in with the real values of this machine:

```
interface=<name of the network interface that has the machine's IPv4 address, not lo>
ip_address=<IPv4 address of that interface, without the prefix>
prefix_length=<prefix length of that address, for example 24>
default_gateway=<IPv4 address of the default route's gateway>
listening_ports=<all TCP ports in LISTEN state, as a comma separated list in ascending order>
```

### Task 2: Record the commands

Create `/home/user/commands.txt` with the commands you used:

```
ip_command=<command that shows the IP address and prefix>
route_command=<command that shows the routing table>
ports_command=<command that shows the listening TCP ports>
```

### Task 3: Interpret the output

`/home/user/questions.txt` contains four multiple-choice questions about what you found. Create `/home/user/interpretation.txt` with one line per question in the form `Q1=B`.

## Notes

- Use the modern `ip` and `ss` commands where you can. The older `ifconfig`, `route` and `netstat` are installed too.
- Some services listen only on `127.0.0.1`. They still count as listening ports.

## Expected outcome

Three files that describe the interface, address, subnet, gateway and listening ports, how you found them, and what they mean.
