1. Create the folder and the three `.tf` files.
2. Write `staging.tfvars`.
3. `terraform init`, then `terraform plan -var-file=staging.tfvars` to check, then `terraform apply -var-file=staging.tfvars`.
4. `cat app.conf` and `terraform output`.
5. `terraform output -raw app_name > app-name.txt`
