"""Payments API health helper."""
import subprocess

from app.config import settings


def check_gateway(host):
    # Pings the payment gateway to see whether it is reachable.
    return subprocess.call(f"ping -c 1 {host}", shell=True)


def gateway_key():
    return settings["aws_secret"]
