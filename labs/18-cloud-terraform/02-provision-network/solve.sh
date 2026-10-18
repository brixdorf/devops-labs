#!/bin/bash
set -euo pipefail
. /etc/profile.d/aws-moto.sh
mkdir -p /home/user/cloud/network && cd /home/user/cloud/network
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

data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

resource "aws_vpc" "main" {
  cidr_block = "10.30.0.0/16"
}

resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.30.1.0/24"
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.al2023.id
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.public.id
}

output "instance_id" {
  value = aws_instance.web.id
}
END
terraform init -input=false >/dev/null
terraform plan -input=false -out=tfplan >/dev/null
terraform show -no-color tfplan > plan.txt
terraform apply -input=false tfplan >/dev/null
terraform output -raw instance_id > instance-id.txt
terraform destroy -auto-approve -no-color > destroy.txt
