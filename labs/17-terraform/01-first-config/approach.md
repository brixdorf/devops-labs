1. `mkdir -p /home/user/tf/basics && cd /home/user/tf/basics`, then write `main.tf`.
2. `terraform fmt` rewrites the file in the standard style.
3. `terraform init` downloads (here: links) the providers and writes `.terraform.lock.hcl`.
4. `terraform validate` checks the syntax and references.
5. `terraform plan -out=tfplan`, then `terraform show -no-color tfplan > plan.txt`.
6. Read the plan and write `explain.txt`.
