```bash
sudo groupadd devops                         # password: user@123!
sudo useradd -m -s /bin/bash examuser
sudo usermod -aG devops examuser
sudo mkdir -p /srv/devops-project
sudo chown examuser:devops /srv/devops-project
sudo chmod 2770 /srv/devops-project
id examuser
ls -ld /srv/devops-project                   # drwxrws--- examuser devops
```
