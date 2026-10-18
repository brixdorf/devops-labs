import json
import os

from labcheck import Checker, ensure, lines, quote, read, run

c = Checker()


def inspect(kind, name):
    r = run(["docker", kind, "inspect", name] if kind else ["docker", "inspect", name])
    return json.loads(r.out)[0] if r.ok else None


@c.test("the network app-net is a user-defined bridge")
def _():
    net = inspect("network", "app-net")
    ensure(net, "Expected a network named app-net but docker network ls does not show it")
    ensure(net["Driver"] == "bridge", f"Expected the bridge driver but found {net['Driver']}")
    return "app-net exists with the bridge driver"


for name, image_var in [("api", "IMAGE_NGINX"), ("client", "IMAGE_BUSYBOX")]:

    @c.test(f"{name} runs {os.environ.get(image_var, '')} on app-net", requires=["the network app-net is a user-defined bridge"])
    def _(name=name, image_var=image_var):
        info = inspect(None, name)
        ensure(info, f"Expected a container named {name}")
        ensure(info["State"]["Running"], f"Expected {name} to be running but it is {info['State']['Status']}")
        want = os.environ.get(image_var, "")
        ensure(info["Config"]["Image"] in (want, f"docker.io/library/{want}"), f"Expected {name} to run {want} but it runs {info['Config']['Image']}")
        ensure("app-net" in info["NetworkSettings"]["Networks"], f"Expected {name} to be attached to app-net")
        return f"{name} is running on app-net"


@c.test("client reaches api by name", requires=["client runs " + os.environ.get("IMAGE_BUSYBOX", "") + " on app-net"])
def _():
    r = run(["docker", "exec", "client", "wget", "-qO-", "-T", "5", "http://api"], timeout=30)
    ensure(r.ok, f"Expected client to reach http://api by name but it failed: {r.text[:150]}")
    return "wget http://api works from client"


@c.test("name-test.txt holds the page fetched by name")
def _():
    text = read("/home/user/name-test.txt", "the file /home/user/name-test.txt")
    ensure("Welcome to nginx" in text, "Expected the Nginx welcome page fetched from http://api")
    return "The response from api was saved"


@c.test("network-details.txt has api's address and the subnet", requires=["the network app-net is a user-defined bridge"])
def _():
    got = {}
    for line in lines("/home/user/network-details.txt", "the file /home/user/network-details.txt"):
        if "=" in line:
            k, v = line.split("=", 1)
            got[k.strip()] = v.strip()
    net = inspect("network", "app-net")
    subnet = net["IPAM"]["Config"][0]["Subnet"]
    api = inspect(None, "api")
    ip = api["NetworkSettings"]["Networks"]["app-net"]["IPAddress"] if api else ""
    ensure(got.get("api_ip") == ip, f"Expected api_ip={ip} but found {quote(got.get('api_ip', ''))}")
    ensure(got.get("subnet") == subnet, f"Expected subnet={subnet} but found {quote(got.get('subnet', ''))}")
    return f"api is {ip} in {subnet}"


c.run()
