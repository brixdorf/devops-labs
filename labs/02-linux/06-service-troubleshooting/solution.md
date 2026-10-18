The root cause is chosen at random for each lab session. Diagnose first:

```bash
systemctl status inventory
sudo journalctl -u inventory -n 30          # password: user@123!
cat /home/user/causes.txt
```

Then apply the fix that matches the `ERROR` line:

```bash
# C1: invalid value in the configuration file
sudo sed -i 's/^PORT=.*/PORT=8090/' /etc/inventory/inventory.conf

# C2: the service user cannot write to its data directory
sudo chown -R inventory:inventory /var/lib/inventory

# C3: another service already uses port 8090
sudo ss -ltnp | grep 8090
sudo systemctl disable --now legacy-cache
```

Start, enable and verify:

```bash
sudo systemctl restart inventory
sudo systemctl enable inventory
curl http://localhost:8090/health
```

Document it (use the ID you found):

```bash
cat > /home/user/diagnosis.txt <<'END'
status_command=systemctl status inventory
logs_command=journalctl -u inventory
root_cause=C2
END
```
