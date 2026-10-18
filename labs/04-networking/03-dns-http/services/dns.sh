#!/bin/bash
# Local DNS server for the devops.lab zone. Other names are forwarded to
# Docker's resolver, so the internet still resolves.
ip_of() { getent hosts "$1" | awk '{print $1; exit}'; }
until [ -n "$(ip_of web)" ] && [ -n "$(ip_of secure)" ]; do sleep 0.5; done
cat > /etc/dnsmasq.d/devops-lab.conf <<END
no-resolv
server=127.0.0.11
address=/shop.devops.lab/$(ip_of web)
address=/secure.devops.lab/$(ip_of secure)
cname=www.devops.lab,shop.devops.lab
txt-record=devops.lab,"owner=platform-team"
END
exec dnsmasq --no-daemon --conf-dir=/etc/dnsmasq.d --listen-address=0.0.0.0 --bind-interfaces --user=root
