1. For each service, run `ping -c 2 <name>`. Note which one does not reply.
2. For the others, run `curl -v --max-time 5 http://<name>:8080/`. "Connection refused" means a closed port; otherwise note the status code.
3. Write the four `name=state` lines and the `http_error_code` line.
4. Run `sudo ss -tlnp` and find the `python3` process. Its local port goes into `local_port=`.
