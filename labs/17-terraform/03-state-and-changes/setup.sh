#!/bin/bash
set -euo pipefail
rm -rf /home/user/tf && mkdir -p /home/user/tf/inventory
cd /home/user/tf/inventory
cat > main.tf <<'END'
terraform {
  required_providers {
    local  = { source = "hashicorp/local" }
    random = { source = "hashicorp/random" }
  }
}

variable "api_token" {
  type      = string
  sensitive = true
}

resource "random_integer" "port" {
  min = 20000
  max = 29999
}

resource "local_file" "report" {
  filename = "${path.module}/report.txt"
  content  = "inventory report v1\n"
}

output "port" {
  value = random_integer.port.result
}
END
token="tok_$(openssl rand -hex 12 2>/dev/null || echo $RANDOM$RANDOM)"
printf 'api_token = "%s"\n' "$token" > secrets.auto.tfvars
chown -R user:user /home/user/tf
runuser -u user -- bash -c '
set -e
cd /home/user/tf/inventory
git init -q -b main
git config user.name "Lab Student"
git config user.email "student@example.com"
git add main.tf
git commit -q -m "Add inventory configuration"
terraform init -input=false >/dev/null
terraform apply -input=false -auto-approve >/dev/null
'
port=$(runuser -u user -- terraform -chdir=/home/user/tf/inventory output -raw port)
id=$(runuser -u user -- bash -c "cd /home/user/tf/inventory && terraform show -json" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(next(r["values"]["id"] for r in d["values"]["root_module"]["resources"] if r["address"]=="local_file.report"))')
printf '{"port": "%s", "report_id": "%s", "token": "%s"}\n' "$port" "$id" "$token" > "$LAB_CONTEXT_FILE"
