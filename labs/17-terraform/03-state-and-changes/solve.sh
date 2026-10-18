#!/bin/bash
set -euo pipefail
cd /home/user/tf/inventory
terraform state list > state-before.txt
sed -i 's/inventory report v1/inventory report v2/' main.tf
terraform plan -input=false -no-color > plan.txt
printf 'report_action=replace\nport_action=no-op\nstate_file=terraform.tfstate\nresources_in_state=2\n' > explain.txt
terraform apply -input=false -auto-approve >/dev/null
printf '*.tfstate\n*.tfstate.*\n.terraform/\nsecrets.auto.tfvars\n' > .gitignore
git add main.tf .gitignore
git commit -qm "Update the inventory report"
