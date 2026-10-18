## Scenario

The online shop is made of four web services. Each one should answer HTTP requests on port `8080`:

| Service | Address |
| --- | --- |
| storefront | `http://storefront:8080/` |
| payments | `http://payments:8080/` |
| inventory | `http://inventory:8080/` |
| shipping | `http://shipping:8080/` |

The monitoring system says that three of them are broken, each for a different reason:

- **unreachable**: the server does not answer at all on the network (it does not reply to `ping`).
- **closed-port**: the server answers `ping`, but nothing accepts connections on port 8080.
- **http-error**: the service accepts connections, but returns an HTTP error status.

One service is healthy (**ok**).

There is also a local admin web app on **this** machine that should listen on port `8000`, but it was started on a different port by mistake.

## Tasks

### Task 1: Classify each service

Use `ping` to test reachability and `curl` to test the port and the HTTP response. Write `/home/user/diagnosis.txt` with one line per service:

```
storefront=<ok, unreachable, closed-port or http-error>
payments=<...>
inventory=<...>
shipping=<...>
```

### Task 2: Record the HTTP error

Add a line with the HTTP status code returned by the service that has an http-error:

```
http_error_code=<three digit status code>
```

### Task 3: Find the local port

Use `ss` to find the TCP port the local admin web app (a `python3` process) really listens on, and add:

```
local_port=<port>
```

## Notes

- `ping -c 2 <host>` sends two packets and stops.
- `curl -s -o /dev/null -w '%{http_code}\n' <url>` prints just the status code. A status of `000` means no HTTP response was received; read curl's error message (drop `-s`) to see why.
- Use `--max-time 5` with curl so unreachable hosts do not keep you waiting.
- The assignment of problems to services is different in every lab session.

## Expected outcome

`/home/user/diagnosis.txt` names the state of all four services, the HTTP error code and the real local port.
