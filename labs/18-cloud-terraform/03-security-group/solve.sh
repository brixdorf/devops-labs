#!/bin/bash
set -euo pipefail
. /etc/profile.d/aws-moto.sh
mkdir -p /home/user/cloud/firewall && cd /home/user/cloud/firewall
cat > main.tf <<'END'
terraform {
  required_providers {
    aws = { source = "hashicorp/aws" }
  }
}

provider "aws" {
  region = "us-east-1"
  default_tags {
    tags = { Project = "devops-labs" }
  }
}

resource "aws_vpc" "app" {
  cidr_block = "10.40.0.0/16"
}

resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = aws_vpc.app.id

  ingress {
    description = "HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH from the admin network only"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["198.51.100.0/24"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
END
terraform init -input=false >/dev/null
terraform plan -input=false >/dev/null
terraform apply -input=false -auto-approve >/dev/null
terraform state show -no-color aws_security_group.web > sg-audit.txt
printf 'internet_ports=443\nssh_source=198.51.100.0/24\n' > exposure.txt
