import re

from labcheck import Checker, context, ensure, lines, quote

ctx = context()
STATES = {"ok", "unreachable", "closed-port", "http-error"}
c = Checker()


def answers():
    out = {}
    for line in lines("/home/user/diagnosis.txt", "the file /home/user/diagnosis.txt"):
        m = re.fullmatch(r"\s*([a-z_]+)\s*=\s*(\S+)\s*", line)
        if m:
            out[m.group(1)] = m.group(2).lower()
    return out


for name in ["storefront", "payments", "inventory", "shipping"]:

    @c.test(f"{name} is classified correctly")
    def _(name=name):
        got = answers().get(name)
        ensure(got, f"Expected a line '{name}=...' in diagnosis.txt")
        ensure(got in STATES, f"Expected one of ok, unreachable, closed-port or http-error for {name} but found {quote(got)}")
        ensure(got == ctx[name], f"{name} is not {got}. Test it again with ping and curl.")
        return f"{name} is {got}"


@c.test("http_error_code is the status the failing service returns")
def _():
    got = answers().get("http_error_code")
    ensure(got, "Expected a line 'http_error_code=...' in diagnosis.txt")
    ensure(got == ctx["http_error_code"], f"Expected the status code curl reports for the http-error service, not {quote(got)}")
    return f"http_error_code is {got}"


@c.test("local_port is the port the admin app really uses")
def _():
    got = answers().get("local_port")
    ensure(got, "Expected a line 'local_port=...' in diagnosis.txt")
    ensure(got == ctx["local_port"], f"Expected the port that ss shows for the python3 process, not {quote(got)}")
    return f"local_port is {got}"


c.run()
