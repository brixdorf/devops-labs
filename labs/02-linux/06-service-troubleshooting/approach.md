1. Run `systemctl status inventory` and `sudo journalctl -u inventory -n 30`.
2. Find the `ERROR` line. It points to one of these problems:
   - a bad value in `/etc/inventory/inventory.conf`,
   - a data directory the service user `inventory` cannot write to,
   - another service already using port 8090.
3. Fix that problem: correct the config file, give the `inventory` user ownership of `/var/lib/inventory`, or stop and disable the service that holds the port (`sudo ss -ltnp` shows which process).
4. Run `sudo systemctl restart inventory` and `sudo systemctl enable inventory`, then `curl http://localhost:8090/health`.
5. Write `diagnosis.txt` with your two commands and the matching ID from `causes.txt`.
