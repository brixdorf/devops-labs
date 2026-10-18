#!/bin/bash
# Registers with Gitea and starts the runner daemon in the background.
mkdir -p /data
cd /data || exit 1
act_runner register --no-interactive --config /etc/act_runner/config.yaml \
  --instance "$GITEA_INSTANCE_URL" --token "$GITEA_RUNNER_REGISTRATION_TOKEN" \
  --name devops-labs-runner --labels "ubuntu-latest:host,ubuntu-26.04:host,ubuntu-24.04:host" >/var/log/act_runner-register.log 2>&1
nohup act_runner daemon --config /etc/act_runner/config.yaml >/var/log/act_runner.log 2>&1 &
for _ in $(seq 1 60); do
  if grep -qiE 'declare(d)? successfully|runner: .* started' /var/log/act_runner.log 2>/dev/null; then
    touch /run/devops-labs/runner-ready
    break
  fi
  sleep 0.5
done
