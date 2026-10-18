## Objective

Containers on Docker's default network can only reach each other by IP address, which changes every time a container is recreated. On a **user-defined network**, Docker's built-in DNS lets containers find each other by name. In this lab you create such a network and show that name-based communication works.

## Tasks

### Task 1: Create a network

Create a user-defined bridge network named `app-net`.

### Task 2: Run a web server on it

Run a container in the background on `app-net`:

- name: `api`
- image: `{{IMAGE_NGINX}}`

### Task 3: Run a client on it

Run a second container in the background on `app-net` that stays running:

- name: `client`
- image: `{{IMAGE_BUSYBOX}}`
- command: `sleep 3600`

### Task 4: Communicate by name

From inside `client`, request the page at `http://api` (using the container name, not an IP address) and save the result to `/home/user/name-test.txt` on this machine, for example:

```
docker exec client wget -qO- http://api > /home/user/name-test.txt
```

### Task 5: Record the network details

Create `/home/user/network-details.txt` with two lines:

```
api_ip=<IP address of the api container on app-net>
subnet=<subnet of app-net, in CIDR form such as 172.20.0.0/16>
```

## Notes

- Leave both containers running when you submit.
- Do not publish any ports: the containers talk over the private network.

## Expected outcome

`api` and `client` run on `app-net`, `client` reaches `api` by name, and the two files record the response and the network details.
