## Objective

Terraform remembers what it created in its **state**. The state maps each resource address in your configuration (such as `local_file.report`) to a real object, which is how Terraform knows whether to create, update, replace or leave something alone. In this lab you change a resource, read the plan before applying it, connect what you see to the state, and keep the state and secrets out of Git.

The project `/home/user/tf/inventory` is a Git repository with a configuration that has already been applied. It also contains `secrets.auto.tfvars`, which holds an API token.

## Tasks

### Task 1: Inspect the current state

Run `terraform state list` and save its output to `/home/user/tf/inventory/state-before.txt`.

### Task 2: Change a resource and read the plan

In `main.tf`, change the content of the `local_file.report` resource from `inventory report v1` to `inventory report v2` (keep the newline). Run `terraform plan` and save the plan output (with `-no-color`) to `/home/user/tf/inventory/plan.txt`. Read it before you go on.

### Task 3: Explain what you saw

Create `/home/user/tf/inventory/explain.txt` with:

```
report_action=<what the plan does to local_file.report: create, update, replace or delete>
port_action=<what it does to random_integer.port: create, update, replace, delete or no-op>
state_file=<the name of the file where Terraform stores the state here>
resources_in_state=<how many resources the state tracks>
```

### Task 4: Apply

Apply the change. The value of `random_integer.port` must stay the same.

### Task 5: Keep state and secrets out of Git

Create a `.gitignore` that excludes the state files (`*.tfstate` and `*.tfstate.*`), the `.terraform/` folder and `secrets.auto.tfvars`. Commit your configuration change and the `.gitignore`. The repository must not contain any state file, the `.terraform/` folder or the secrets file.

## Notes

- The state file contains every attribute of your resources, including sensitive values, which is one reason it must never be committed.

## Expected outcome

The report file was replaced with the new content, the port kept its value, your explanation matches the plan, and Git tracks the configuration but no state or secrets.
