## Objective

Terraform describes infrastructure as code and works out the steps to make reality match it. To practise the workflow without a cloud account, you will use the `local` provider, which manages files on this machine, and the `random` provider, which generates values. The core loop is the same as in the cloud: **fmt, init, validate, plan**.

The provider plugins are already cached on this machine, so `terraform init` works offline.

## Tasks

### Task 1: Write the configuration

Create `/home/user/tf/basics/main.tf` with:

- a `terraform` block with `required_providers` for `hashicorp/local` and `hashicorp/random`
- a `random_pet` resource named `server` with `length = 2`
- a `local_file` resource named `greeting` that writes the file `greeting.txt` in the module folder (`${path.module}/greeting.txt`) with the content `Hello from ${random_pet.server.id}!` followed by a newline

### Task 2: Format, initialize and validate

In `/home/user/tf/basics`, run `terraform fmt`, `terraform init` and `terraform validate`. The configuration must be correctly formatted and valid.

### Task 3: Plan

Run `terraform plan -out=tfplan` and save the human-readable plan to `plan.txt`:

```
terraform show -no-color tfplan > plan.txt
```

Do not apply the plan.

### Task 4: Explain the plan

Create `/home/user/tf/basics/explain.txt` with:

```
resources_to_add=<how many resources the plan adds>
create_symbol=<the symbol the plan prints in front of resources it will create>
greeting_address=<the resource address of the greeting file, as shown in the plan>
lock_file=<the name of the file terraform init created to record provider versions>
```

## Notes

- `terraform fmt -check` exits with an error when a file is not formatted.

## Expected outcome

A formatted, valid configuration, an initialized working directory, a saved plan that would create two resources, and a correct explanation of the plan.
