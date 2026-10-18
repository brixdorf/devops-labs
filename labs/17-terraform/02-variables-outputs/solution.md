```bash
mkdir -p /home/user/tf/app-config && cd /home/user/tf/app-config
cat > variables.tf <<'END'
variable "environment" {
  type        = string
  description = "Name of the environment, for example staging"
}

variable "owner" {
  type        = string
  description = "Team that owns the application"
}

variable "replicas" {
  type        = number
  description = "Number of application replicas"
  default     = 1
}
END
cat > main.tf <<'END'
terraform {
  required_providers {
    local  = { source = "hashicorp/local" }
    random = { source = "hashicorp/random" }
  }
}

resource "random_pet" "app" {
  prefix = var.environment
}

resource "local_file" "config" {
  filename = "${path.module}/app.conf"
  content  = <<-EOT
    environment=${var.environment}
    owner=${var.owner}
    replicas=${var.replicas}
    app_name=${random_pet.app.id}
  EOT
}
END
cat > outputs.tf <<'END'
output "app_name" {
  value = random_pet.app.id
}

output "config_path" {
  value = local_file.config.filename
}
END
cat > staging.tfvars <<'END'
environment = "staging"
owner       = "platform-team"
replicas    = 3
END
terraform init
terraform apply -var-file=staging.tfvars -auto-approve
terraform output
terraform output -raw app_name > app-name.txt
```
