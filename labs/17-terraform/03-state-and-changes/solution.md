```bash
cd /home/user/tf/inventory
terraform state list > state-before.txt
sed -i 's/inventory report v1/inventory report v2/' main.tf
terraform plan -no-color > plan.txt      # local_file.report must be replaced (-/+), 1 to add, 1 to destroy

cat > explain.txt <<'END'
report_action=replace
port_action=no-op
state_file=terraform.tfstate
resources_in_state=2
END

terraform apply -auto-approve

cat > .gitignore <<'END'
*.tfstate
*.tfstate.*
.terraform/
secrets.auto.tfvars
END
git status
git add main.tf .gitignore
git commit -m "Update the inventory report"
git ls-files
```
