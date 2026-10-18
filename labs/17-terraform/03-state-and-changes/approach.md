1. `cd /home/user/tf/inventory`, then `terraform state list > state-before.txt`.
2. Edit `main.tf` with `nano`, then `terraform plan -no-color > plan.txt` and read it.
3. Write `explain.txt` from what the plan says.
4. `terraform apply`, then compare `terraform state show random_integer.port` with before.
5. Write `.gitignore`, check `git status`, and commit only `main.tf` and `.gitignore`.
