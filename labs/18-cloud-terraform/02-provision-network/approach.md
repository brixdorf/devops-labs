1. Write the provider, data source, network resources, instance and output.
2. `terraform init` and `terraform validate`.
3. `terraform plan -out=tfplan`, then `terraform show -no-color tfplan > plan.txt` and read it: 6 resources to add.
4. `terraform apply tfplan`, then save the output.
5. `terraform destroy -auto-approve -no-color > destroy.txt`, then `terraform state list` should print nothing.
