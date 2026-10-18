## Objective

This lab has a sandbox AWS account: **Moto**, a local server that implements the AWS APIs. The terminal is already configured for it (the variables `AWS_ENDPOINT_URL`, `AWS_REGION` and fake access keys are set), so the Terraform AWS provider talks to Moto instead of the real AWS, and nothing costs money.

You will provision a small network with one low-cost server, using the safe workflow: **plan, review, apply from the saved plan**, and then **destroy** everything when you are done, as you should with any lab or sandbox account.

## Tasks

Work in `/home/user/cloud/network` (create it).

### Task 1: Write the configuration

In `main.tf`, using the `hashicorp/aws` provider with `region = "us-east-1"`, create:

- `aws_vpc.main` with CIDR `10.30.0.0/16`
- `aws_subnet.public` with CIDR `10.30.1.0/24` in that VPC
- `aws_internet_gateway.main` attached to the VPC
- `aws_route_table.public` with a route `0.0.0.0/0` to the internet gateway, and `aws_route_table_association.public` for the subnet
- `aws_instance.web` of type `t3.micro` in the public subnet, using the newest Amazon Linux 2023 image found with a `data "aws_ami"` lookup (owner `amazon`, name `al2023-ami-*-x86_64`)

Tag every resource that supports tags with `Project = "devops-labs"`.

Add an output `instance_id` with the instance ID.

### Task 2: Plan and review

Run `terraform init`, then save a plan with `terraform plan -out=tfplan` and its readable form with `terraform show -no-color tfplan > plan.txt`. Review what will be created.

### Task 3: Apply the saved plan

Apply exactly the plan you reviewed with `terraform apply tfplan`, and save the instance ID to `instance-id.txt` with `terraform output -raw instance_id > instance-id.txt`.

### Task 4: Destroy

Destroy everything you created and save the output: `terraform destroy -auto-approve -no-color > destroy.txt`.

## Notes

- Do not put access keys in your configuration: the provider reads them from the environment.
- The checker asks Moto which API calls were made, so it can see what was created and destroyed.

## Expected outcome

The network and the instance were created from a reviewed plan and then destroyed, leaving nothing running in the sandbox account.
