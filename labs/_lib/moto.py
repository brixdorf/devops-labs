"""Helpers for checkers of labs that use the Moto server (local AWS stand-in)."""
import base64
import json

from labcheck import http

MOTO = "http://moto:5000"


def recorded_calls():
    """Returns the AWS API actions recorded by Moto, in order (for example RunInstances)."""
    status, body = http(f"{MOTO}/moto-api/recorder/download-recording", timeout=20)
    actions = []
    if status != 200:
        return actions
    for line in body.splitlines():
        try:
            entry = json.loads(line)
        except ValueError:
            continue
        body = entry.get("body") or ""
        if entry.get("body_encoded"):
            try:
                body = base64.b64decode(body).decode("utf-8", errors="replace")
            except ValueError:
                body = ""
        text = " ".join([str(body), str(entry.get("qs", "")), str(entry.get("url", ""))])
        for part in text.replace("&", " ").replace("?", " ").split():
            if part.startswith("Action="):
                actions.append(part.split("=", 1)[1])
    return actions


def ec2_data():
    """Returns Moto's EC2 backend data from its dashboard API."""
    status, body = http(f"{MOTO}/moto-api/data.json", timeout=20)
    if status != 200:
        return {}
    try:
        return json.loads(body).get("ec2", {})
    except ValueError:
        return {}


def lab_instances():
    """Moto EC2 instances tagged Project=devops-labs."""
    out = []
    for inst in ec2_data().get("Instance", []):
        tags = {t.get("key"): t.get("value") for t in inst.get("tag_set") or []}
        if tags.get("Project") == "devops-labs":
            out.append(inst)
    return out
