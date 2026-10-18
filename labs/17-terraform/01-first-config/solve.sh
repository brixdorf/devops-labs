#!/bin/bash
set -euo pipefail
mkdir -p /home/user/tf/basics && cd /home/user/tf/basics
cat > main.tf <<'END'
terraform {
  required_providers {
    local = {
      source = "hashicorp/local"
    }
    random = {
      source = "hashicorp/random"
    }
  }
}

resource "random_pet" "server" {
  length = 2
}

resource "local_file" "greeting" {
  filename = "${path.module}/greeting.txt"
  content  = "Hello from ${random_pet.server.id}!\n"
}
END
terraform fmt >/dev/null
terraform init -input=false >/dev/null
terraform validate >/dev/null
terraform plan -input=false -out=tfplan >/dev/null
terraform show -no-color tfplan > plan.txt
printf 'resources_to_add=2\ncreate_symbol=+\ngreeting_address=local_file.greeting\nlock_file=.terraform.lock.hcl\n' > explain.txt
