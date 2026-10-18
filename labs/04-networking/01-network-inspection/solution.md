```bash
ip a                 # interface eth0 with something like inet 172.18.0.3/16
ip route             # default via 172.18.0.1 dev eth0
ss -tln              # LISTEN on 0.0.0.0:8080, 127.0.0.1:5432 and others
```

Write the values you see (yours will differ):

```bash
cat > /home/user/network-report.txt <<'END'
interface=eth0
ip_address=172.18.0.3
prefix_length=16
default_gateway=172.18.0.1
listening_ports=2222,5432,8080
END

cat > /home/user/commands.txt <<'END'
ip_command=ip addr show
route_command=ip route
ports_command=ss -tln
END

cat > /home/user/interpretation.txt <<'END'
Q1=B
Q2=A
Q3=C
Q4=B
END
```

Why: the prefix length counts the network bits of the address (Q1=B); the default route is used for every destination without a more specific route (Q2=A); `0.0.0.0:8080` accepts connections on every interface (Q3=C); `127.0.0.1:5432` is reachable only from this machine (Q4=B).
