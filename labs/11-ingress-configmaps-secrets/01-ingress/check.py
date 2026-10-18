from labcheck import Checker, ensure, http, k8s, read

c = Checker()


def svc(name, app):
    s = k8s(f"get service {name} -n web")
    ensure(s, f"Expected a Service named {name} in the web namespace")
    ensure(s["spec"].get("selector", {}).get("app") == app, f"Expected {name} to select app={app}")
    ensure(s["spec"]["ports"][0].get("port") == 80, f"Expected {name} to listen on port 80")
    return f"{name} selects app={app} on port 80"


@c.test("shop-svc and blog-svc exist")
def _():
    return svc("shop-svc", "shop") + "; " + svc("blog-svc", "blog")


@c.test("site-ingress routes each host to its Service", requires=["shop-svc and blog-svc exist"])
def _():
    ing = k8s("get ingress site-ingress -n web")
    ensure(ing, "Expected an Ingress named site-ingress in the web namespace")
    ensure(ing["spec"].get("ingressClassName") == "traefik", f"Expected ingress class traefik but found {ing['spec'].get('ingressClassName')}")
    routes = {}
    for rule in ing["spec"].get("rules", []):
        for p in rule.get("http", {}).get("paths", []):
            routes[rule.get("host")] = p["backend"]["service"]["name"]
    ensure(routes.get("shop.devops.local") == "shop-svc", f"Expected shop.devops.local to go to shop-svc but found {routes.get('shop.devops.local')}")
    ensure(routes.get("blog.devops.local") == "blog-svc", f"Expected blog.devops.local to go to blog-svc but found {routes.get('blog.devops.local')}")
    return "shop.devops.local -> shop-svc, blog.devops.local -> blog-svc"


@c.test("Traefik routes the requests by host name", requires=["site-ingress routes each host to its Service"])
def _():
    s_status, s_body = http("http://k3s/", headers={"Host": "shop.devops.local"})
    b_status, b_body = http("http://k3s/", headers={"Host": "blog.devops.local"})
    ensure(s_status == 200 and "Welcome to nginx" in s_body, f"Expected Nginx for shop.devops.local but got HTTP {s_status}")
    ensure(b_status == 200 and "It works!" in b_body, f"Expected Apache for blog.devops.local but got HTTP {b_status}")
    o_status, _ = http("http://k3s/", headers={"Host": "other.devops.local"})
    ensure(o_status == 404, f"Expected other host names to get 404 but got HTTP {o_status}")
    return "Both hosts reach their own app; unknown hosts get 404"


@c.test("the saved responses come from the right apps")
def _():
    ensure("Welcome to nginx" in read("/home/user/ingress/shop.html"), "Expected the Nginx page in shop.html")
    ensure("It works!" in read("/home/user/ingress/blog.html"), "Expected the Apache page in blog.html")
    return "shop.html is Nginx, blog.html is Apache"


c.run()
