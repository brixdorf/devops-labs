#!/bin/bash
# Starts a few listening services: one on all interfaces, one on loopback only
# and one on a random port.
set -euo pipefail
extra=$(( 2000 + RANDOM % 7000 ))
start() { setsid nohup python3 -c "import socket,time
s=socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1); s.bind(('$1', $2)); s.listen()
while True: time.sleep(3600)" >/dev/null 2>&1 < /dev/null & }
start 0.0.0.0 8080
start 127.0.0.1 5432
start 0.0.0.0 "$extra"
cat > /home/user/questions.txt <<'END'
Q1: In an address such as 172.18.0.3/16, what does /16 mean?
  A) The machine has 16 network interfaces.
  B) The first 16 bits of the address identify the network (the subnet).
  C) The address can be used by 16 machines at the same time.

Q2: When is the default route used?
  A) For any destination that no more specific route matches.
  B) Only for traffic to the local subnet.
  C) Only for DNS lookups.

Q3: What does a listening socket on 0.0.0.0:8080 mean?
  A) Port 8080 is closed.
  B) Only programs on this machine can connect to port 8080.
  C) Port 8080 accepts connections on every network interface of the machine.

Q4: What does a listening socket on 127.0.0.1:5432 mean?
  A) Any machine on the network can connect to port 5432.
  B) Only programs on this machine can connect to port 5432.
  C) The service on port 5432 is making an outgoing connection.
END
chown user:user /home/user/questions.txt
rm -f /home/user/network-report.txt /home/user/commands.txt /home/user/interpretation.txt
sleep 1
