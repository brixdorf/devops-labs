1. Create the group with `sudo groupadd devops`.
2. Create the user with a home directory and bash as shell using `sudo useradd`.
3. Add the user to `devops` with `sudo usermod -aG`.
4. Create `/srv/devops-project`, set its owner and group with `chown`, and its mode with `chmod 2770`.
5. Verify with `id examuser`, `getent group devops` and `ls -ld /srv/devops-project` (the mode shows as `drwxrws---`).
