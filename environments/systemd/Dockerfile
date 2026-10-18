# systemd environment: real systemd as PID 1 in a privileged container.
ARG PARENT_IMAGE
FROM ${PARENT_IMAGE}
RUN apt-get update \
 && apt-get install -y --no-install-recommends systemd systemd-sysv dbus cron \
 && rm -rf /var/lib/apt/lists/* \
 && systemctl mask systemd-modules-load.service systemd-udevd.service systemd-udev-trigger.service \
      getty@tty1.service console-getty.service systemd-logind.service systemd-firstboot.service \
      systemd-networkd-wait-online.service systemd-resolved.service systemd-timesyncd.service apt-daily.timer \
      apt-daily-upgrade.timer motd-news.timer 2>/dev/null; true
COPY lab-init.service /etc/systemd/system/lab-init.service
RUN systemctl enable lab-init.service
STOPSIGNAL SIGRTMIN+3
CMD ["/sbin/init"]
