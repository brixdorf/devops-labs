```bash
kubectl expose deployment shop --name=shop-svc --port=80 -n web
kubectl expose deployment blog --name=blog-svc --port=80 -n web
cat <<'END' | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: site-ingress
  namespace: web
spec:
  ingressClassName: traefik
  rules:
    - host: shop.devops.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: shop-svc
                port:
                  number: 80
    - host: blog.devops.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: blog-svc
                port:
                  number: 80
END
mkdir -p /home/user/ingress
curl -s -H 'Host: shop.devops.local' http://k3s/ > /home/user/ingress/shop.html
curl -s -H 'Host: blog.devops.local' http://k3s/ > /home/user/ingress/blog.html
```
