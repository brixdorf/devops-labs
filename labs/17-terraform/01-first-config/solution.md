```bash
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
terraform fmt
terraform init
terraform validate
terraform plan -out=tfplan
terraform show -no-color tfplan > plan.txt

cat > explain.txt <<'END'
resources_to_add=2
create_symbol=+
greeting_address=local_file.greeting
lock_file=.terraform.lock.hcl
END
```
