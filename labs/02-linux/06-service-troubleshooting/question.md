## Scenario

This machine runs **systemd**. The `inventory` service is a small HTTP API that should answer on port `8090`, but users report that it is down. Your job is to find out why with the standard diagnostic tools, fix it, and document how you diagnosed it.

Password for sudo: `user@123!`

## Tasks

### Task 1: Diagnose

Check the status of the `inventory` service and read its logs. The logs explain why it fails.

### Task 2: Fix the root cause

Fix the problem so that the service starts and stays running. Rules:

- Keep the service as it is defined in `/etc/systemd/system/inventory.service`. Do not edit or replace the unit file.
- The service must listen on port `8090` and keep using `/var/lib/inventory` for its data.

### Task 3: Start and enable

Make sure `inventory` is running now **and** starts automatically at boot (enabled).

Verify it with:

```
curl http://localhost:8090/health
```

### Task 4: Document the diagnosis

The possible root causes are listed in `/home/user/causes.txt`. Create `/home/user/diagnosis.txt` with exactly these three lines:

```
status_command=<the command you used to check the service status>
logs_command=<the command you used to read the service logs>
root_cause=<the ID of the root cause from causes.txt>
```

## Notes

- `systemctl` and `journalctl` need `sudo` for changes and for some logs.
- After fixing the cause, a failed service needs to be started again.

## Expected outcome

`inventory` is active and enabled, `curl http://localhost:8090/health` returns a JSON status of `ok`, and `diagnosis.txt` records your commands and the root cause.
