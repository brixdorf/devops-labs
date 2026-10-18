```bash
docker network create app-net
docker run -d --name api --network app-net {{IMAGE_NGINX}}
docker run -d --name client --network app-net {{IMAGE_BUSYBOX}} sleep 3600
docker exec client wget -qO- http://api > /home/user/name-test.txt
docker network inspect app-net        # Subnet and the IPv4Address of api

ip=$(docker inspect -f '{{(index .NetworkSettings.Networks "app-net").IPAddress}}' api)
subnet=$(docker network inspect -f '{{(index .IPAM.Config 0).Subnet}}' app-net)
printf 'api_ip=%s\nsubnet=%s\n' "$ip" "$subnet" > /home/user/network-details.txt
```
