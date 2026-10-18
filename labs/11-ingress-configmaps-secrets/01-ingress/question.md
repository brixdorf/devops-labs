## Objective

An **Ingress** routes HTTP requests from one entry point to different Services, based on the host name or the URL path. The cluster runs the Traefik ingress controller, which listens on port 80 of the node (`k3s`). You will publish two applications behind one Ingress, one per host name.

Two Deployments already run in the `web` namespace:

- `shop`, an Nginx server
- `blog`, an Apache httpd server

## Tasks

### Task 1: Create the Services

In the `web` namespace, create two ClusterIP Services:

- `shop-svc` on port `80`, selecting the `shop` Pods
- `blog-svc` on port `80`, selecting the `blog` Pods

### Task 2: Create the Ingress

Create an Ingress named `site-ingress` in the `web` namespace, with ingress class `traefik` and two rules:

- requests for host `shop.devops.local` go to `shop-svc` port 80 (path `/`, path type `Prefix`)
- requests for host `blog.devops.local` go to `blog-svc` port 80 (path `/`, path type `Prefix`)

### Task 3: Test the routing

The host names do not exist in DNS, so send the requests to the node and set the `Host` header yourself:

```
curl -H 'Host: shop.devops.local' http://k3s/
curl -H 'Host: blog.devops.local' http://k3s/
```

Save the two responses to `/home/user/ingress/shop.html` and `/home/user/ingress/blog.html`.

## Notes

- The `ingress` folder does not exist yet.
- Requests for any other host must not reach either application (Traefik answers 404).

## Expected outcome

`site-ingress` sends each host to its own Service, and the two saved pages come from Nginx and Apache respectively.
